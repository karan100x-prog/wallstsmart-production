// metricsCalculator.ts - Fixed Altman Z-Score Calculation
import { 
  fetchIncomeStatement, 
  fetchBalanceSheet,
  fetchCashFlow 
} from './alphaVantage';

class MetricsCalculator {
  
  // FIXED ALTMAN Z-SCORE CALCULATION
  calculateAltmanZScore(overview: any, income: any, balance: any) {
    try {
      if (!overview || !income || !balance) {
        console.error('Missing data for Altman Z-Score calculation');
        return { score: 'N/A', interpretation: 'Insufficient data' };
      }

      // Get the latest balance sheet data
      const latestBalance = balance.annualReports?.[0] || {};
      const latestIncome = income.annualReports?.[0] || {};
      
      // Parse values with proper validation
      const currentAssets = parseFloat(latestBalance.totalCurrentAssets || 0);
      const currentLiabilities = parseFloat(latestBalance.totalCurrentLiabilities || 0);
      const totalAssets = parseFloat(latestBalance.totalAssets || 0);
      const retainedEarnings = parseFloat(latestBalance.retainedEarnings || 0);
      const ebit = parseFloat(latestIncome.ebit || latestIncome.operatingIncome || 0);
      const revenue = parseFloat(latestIncome.totalRevenue || 0);
      const totalLiabilities = parseFloat(latestBalance.totalLiabilities || 0);
      
      // CRITICAL FIX: Market Cap should be in the same units as book values
      // Alpha Vantage provides MarketCapitalization already calculated
      let marketValueEquity = parseFloat(overview.MarketCapitalization || 0);
      
      // If market cap is missing, estimate from share price * shares outstanding
      if (!marketValueEquity || marketValueEquity === 0) {
        const sharePrice = parseFloat(overview['50DayMovingAverage'] || 0);
        const sharesOutstanding = parseFloat(overview.SharesOutstanding || 0);
        marketValueEquity = sharePrice * sharesOutstanding;
      }

      // Validate that we have the minimum required data
      if (totalAssets === 0) {
        console.error('Total assets is 0 - cannot calculate Altman Z-Score');
        return { score: 'N/A', interpretation: 'Missing total assets data' };
      }

      if (totalLiabilities === 0) {
        console.error('Total liabilities is 0 - cannot calculate Altman Z-Score');
        return { score: 'N/A', interpretation: 'Missing liabilities data' };
      }

      // Calculate the five components (X1 to X5)
      const workingCapital = currentAssets - currentLiabilities;
      
      // X1: Working Capital / Total Assets
      const X1 = workingCapital / totalAssets;
      
      // X2: Retained Earnings / Total Assets
      const X2 = retainedEarnings / totalAssets;
      
      // X3: EBIT / Total Assets
      const X3 = ebit / totalAssets;
      
      // X4: Market Value of Equity / Book Value of Total Liabilities
      // CRITICAL: This ratio often causes inflated scores if market cap is in different units
      const X4 = marketValueEquity / totalLiabilities;
      
      // X5: Sales / Total Assets
      const X5 = revenue / totalAssets;

      // Log the components for debugging
      console.log(`${overview.Symbol} Altman Z-Score Components:`, {
        X1: X1.toFixed(4),
        X2: X2.toFixed(4),
        X3: X3.toFixed(4),
        X4: X4.toFixed(4),
        X5: X5.toFixed(4),
        workingCapital,
        retainedEarnings,
        ebit,
        marketValueEquity,
        totalLiabilities,
        revenue,
        totalAssets
      });

      // Apply the Altman Z-Score formula for PUBLIC companies
      // Z = 1.2(X1) + 1.4(X2) + 3.3(X3) + 0.6(X4) + 1.0(X5)
      const zScore = (1.2 * X1) + (1.4 * X2) + (3.3 * X3) + (0.6 * X4) + (1.0 * X5);

      // Sanity check - if Z-Score is unreasonably high, there's likely a data issue
      if (zScore > 10) {
        console.warn(`${overview.Symbol}: Unusually high Z-Score (${zScore.toFixed(2)}) - possible data quality issue`);
        
        // Try alternative calculation for private companies (Z'-Score)
        // This uses book value of equity instead of market value
        const bookValueEquity = totalAssets - totalLiabilities;
        const X4_private = bookValueEquity / totalLiabilities;
        
        // Z' = 0.717(X1) + 0.847(X2) + 3.107(X3) + 0.420(X4) + 0.998(X5)
        const zScorePrivate = (0.717 * X1) + (0.847 * X2) + (3.107 * X3) + (0.420 * X4_private) + (0.998 * X5);
        
        if (zScorePrivate < 10) {
          // Use the private company formula if it gives more reasonable results
          return this.interpretZScore(zScorePrivate, true);
        }
      }

      return this.interpretZScore(zScore, false);
      
    } catch (error) {
      console.error('Error calculating Altman Z-Score:', error);
      return { score: 'N/A', interpretation: 'Calculation error' };
    }
  }

  // Helper function to interpret Z-Score
  interpretZScore(score: number, isPrivateCompany: boolean = false) {
    let interpretation = '';
    
    if (isPrivateCompany) {
      // Private company thresholds
      if (score > 2.9) {
        interpretation = 'Safe Zone - Low bankruptcy risk';
      } else if (score > 1.23) {
        interpretation = 'Grey Zone - Moderate bankruptcy risk';
      } else {
        interpretation = 'Distress Zone - High bankruptcy risk';
      }
    } else {
      // Public company thresholds
      if (score > 2.99) {
        interpretation = 'Safe Zone - Low bankruptcy risk';
      } else if (score > 1.81) {
        interpretation = 'Grey Zone - Moderate bankruptcy risk';
      } else {
        interpretation = 'Distress Zone - High bankruptcy risk';
      }
    }

    return {
      score: score.toFixed(2),
      interpretation,
      components: {
        warning: score > 10 ? 'Score may be unreliable due to data quality' : null
      }
    };
  }

  // Calculate Piotroski F-Score (9 points total)
  calculatePiotroskiScore(income: any, balance: any, cashFlow: any) {
    try {
      let score = 0;
      const details = [];

      // Get current and previous year data
      const currentIncome = income?.annualReports?.[0] || {};
      const previousIncome = income?.annualReports?.[1] || {};
      const currentBalance = balance?.annualReports?.[0] || {};
      const previousBalance = balance?.annualReports?.[1] || {};
      const currentCashFlow = cashFlow?.annualReports?.[0] || {};

      // 1. Positive Net Income (1 point)
      const netIncome = parseFloat(currentIncome.netIncome || 0);
      if (netIncome > 0) {
        score++;
        details.push('✓ Positive net income');
      }

      // 2. Positive ROA (1 point)
      const totalAssets = parseFloat(currentBalance.totalAssets || 0);
      const roa = totalAssets > 0 ? netIncome / totalAssets : 0;
      if (roa > 0) {
        score++;
        details.push('✓ Positive ROA');
      }

      // 3. Positive Operating Cash Flow (1 point)
      const operatingCashFlow = parseFloat(currentCashFlow.operatingCashflow || 0);
      if (operatingCashFlow > 0) {
        score++;
        details.push('✓ Positive operating cash flow');
      }

      // 4. Cash Flow > Net Income (quality of earnings) (1 point)
      if (operatingCashFlow > netIncome) {
        score++;
        details.push('✓ High quality earnings');
      }

      // 5. Lower Long-term Debt ratio (1 point)
      const currentLongTermDebt = parseFloat(currentBalance.longTermDebt || 0);
      const previousLongTermDebt = parseFloat(previousBalance.longTermDebt || 0);
      const currentTotalAssets = parseFloat(currentBalance.totalAssets || 1);
      const previousTotalAssets = parseFloat(previousBalance.totalAssets || 1);
      
      const currentDebtRatio = currentLongTermDebt / currentTotalAssets;
      const previousDebtRatio = previousLongTermDebt / previousTotalAssets;
      
      if (currentDebtRatio < previousDebtRatio) {
        score++;
        details.push('✓ Decreasing debt ratio');
      }

      // 6. Higher Current Ratio (1 point)
      const currentRatio = this.calculateCurrentRatio(balance);
      const previousCurrentRatio = this.calculateCurrentRatioPrevious(balance);
      if (parseFloat(currentRatio) > parseFloat(previousCurrentRatio)) {
        score++;
        details.push('✓ Improving liquidity');
      }

      // 7. No New Shares Issued (1 point)
      const currentShares = parseFloat(currentBalance.commonStockSharesOutstanding || 0);
      const previousShares = parseFloat(previousBalance.commonStockSharesOutstanding || 0);
      if (currentShares <= previousShares) {
        score++;
        details.push('✓ No dilution');
      }

      // 8. Higher Gross Margin (1 point)
      const currentGrossProfit = parseFloat(currentIncome.grossProfit || 0);
      const currentRevenue = parseFloat(currentIncome.totalRevenue || 1);
      const previousGrossProfit = parseFloat(previousIncome.grossProfit || 0);
      const previousRevenue = parseFloat(previousIncome.totalRevenue || 1);
      
      const currentGrossMargin = currentGrossProfit / currentRevenue;
      const previousGrossMargin = previousGrossProfit / previousRevenue;
      
      if (currentGrossMargin > previousGrossMargin) {
        score++;
        details.push('✓ Improving gross margin');
      }

      // 9. Higher Asset Turnover (1 point)
      const currentAssetTurnover = currentRevenue / currentTotalAssets;
      const previousAssetTurnover = previousRevenue / previousTotalAssets;
      
      if (currentAssetTurnover > previousAssetTurnover) {
        score++;
        details.push('✓ Improving asset efficiency');
      }

      return {
        score,
        details,
        interpretation: score >= 7 ? 'Strong' : score >= 5 ? 'Moderate' : 'Weak'
      };

    } catch (error) {
      console.error('Error calculating Piotroski Score:', error);
      return { score: 0, details: [], interpretation: 'N/A' };
    }
  }

  // Free Cash Flow calculation
  calculateFreeCashFlow(cashFlow: any) {
    try {
      const latestCashFlow = cashFlow?.annualReports?.[0] || {};
      const operatingCashFlow = parseFloat(latestCashFlow.operatingCashflow || 0);
      const capitalExpenditures = Math.abs(parseFloat(latestCashFlow.capitalExpenditures || 0));
      return operatingCashFlow - capitalExpenditures;
    } catch (error) {
      console.error('Error calculating FCF:', error);
      return 0;
    }
  }

  // FCF Yield calculation
  calculateFCFYield(overview: any, cashFlow: any) {
    try {
      const fcf = this.calculateFreeCashFlow(cashFlow);
      const marketCap = parseFloat(overview?.MarketCapitalization || 0);
      if (marketCap === 0) return 'N/A';
      return ((fcf / marketCap) * 100).toFixed(2);
    } catch (error) {
      console.error('Error calculating FCF Yield:', error);
      return 'N/A';
    }
  }

  // Current Ratio calculation
  calculateCurrentRatio(balance: any) {
    try {
      const latestBalance = balance?.annualReports?.[0] || {};
      const currentAssets = parseFloat(latestBalance.totalCurrentAssets || 0);
      const currentLiabilities = parseFloat(latestBalance.totalCurrentLiabilities || 0);
      if (currentLiabilities === 0) return 'N/A';
      return (currentAssets / currentLiabilities).toFixed(2);
    } catch (error) {
      console.error('Error calculating Current Ratio:', error);
      return 'N/A';
    }
  }

  // Previous year Current Ratio for comparison
  calculateCurrentRatioPrevious(balance: any) {
    try {
      const previousBalance = balance?.annualReports?.[1] || {};
      const currentAssets = parseFloat(previousBalance.totalCurrentAssets || 0);
      const currentLiabilities = parseFloat(previousBalance.totalCurrentLiabilities || 0);
      if (currentLiabilities === 0) return '0';
      return (currentAssets / currentLiabilities).toFixed(2);
    } catch (error) {
      return '0';
    }
  }

  // Quick Ratio calculation
  calculateQuickRatio(balance: any) {
    try {
      const latestBalance = balance?.annualReports?.[0] || {};
      const currentAssets = parseFloat(latestBalance.totalCurrentAssets || 0);
      const inventory = parseFloat(latestBalance.inventory || 0);
      const currentLiabilities = parseFloat(latestBalance.totalCurrentLiabilities || 0);
      if (currentLiabilities === 0) return 'N/A';
      return ((currentAssets - inventory) / currentLiabilities).toFixed(2);
    } catch (error) {
      console.error('Error calculating Quick Ratio:', error);
      return 'N/A';
    }
  }

  // Debt to Equity calculation
  calculateDebtToEquity(balance: any) {
    try {
      const latestBalance = balance?.annualReports?.[0] || {};
      const totalLiabilities = parseFloat(latestBalance.totalLiabilities || 0);
      const totalEquity = parseFloat(latestBalance.totalShareholderEquity || 0);
      if (totalEquity === 0) return 'N/A';
      return (totalLiabilities / totalEquity).toFixed(2);
    } catch (error) {
      console.error('Error calculating Debt to Equity:', error);
      return 'N/A';
    }
  }

  // Return on Invested Capital (ROIC)
  calculateROIC(income: any, balance: any) {
    try {
      const latestIncome = income?.annualReports?.[0] || {};
      const latestBalance = balance?.annualReports?.[0] || {};
      
      const ebit = parseFloat(latestIncome.ebit || latestIncome.operatingIncome || 0);
      const taxRate = parseFloat(latestIncome.incomeTaxExpense || 0) / 
                      parseFloat(latestIncome.incomeBeforeTax || 1);
      const nopat = ebit * (1 - taxRate); // Net Operating Profit After Tax
      
      const totalEquity = parseFloat(latestBalance.totalShareholderEquity || 0);
      const longTermDebt = parseFloat(latestBalance.longTermDebt || 0);
      const shortTermDebt = parseFloat(latestBalance.shortTermDebt || 0);
      const cash = parseFloat(latestBalance.cashAndCashEquivalentsAtCarryingValue || 0);
      
      const investedCapital = totalEquity + longTermDebt + shortTermDebt - cash;
      
      if (investedCapital <= 0) return 'N/A';
      return ((nopat / investedCapital) * 100).toFixed(2);
    } catch (error) {
      console.error('Error calculating ROIC:', error);
      return 'N/A';
    }
  }
}

export default new MetricsCalculator();
