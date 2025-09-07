// Advanced Financial Metrics Calculator for WallStSmart
export class MetricsCalculator {
  
  // Calculate Altman Z-Score (Bankruptcy Risk)
  calculateAltmanZScore(overview: any, income: any, balance: any) {
    try {
      if (!income?.annualReports?.[0] || !balance?.annualReports?.[0]) {
        return null;
      }
      const latestIncome = income.annualReports[0];
      const latestBalance = balance.annualReports[0];
      
      const totalAssets = parseFloat(latestBalance.totalAssets || 0);
      if (totalAssets === 0) return null;
      const totalLiabilities = parseFloat(latestBalance.totalLiabilities || 0);
      const workingCapital = 
        parseFloat(latestBalance.totalCurrentAssets || 0) - 
        parseFloat(latestBalance.totalCurrentLiabilities || 0);
      const retainedEarnings = parseFloat(latestBalance.retainedEarnings || 0);
      const ebit = parseFloat(latestIncome.ebit || latestIncome.operatingIncome || 0);
      const marketCap = parseFloat(overview.MarketCapitalization || 0);
      const revenue = parseFloat(latestIncome.totalRevenue || 0);
      
      const z = 
        (1.2 * (workingCapital / totalAssets)) +
        (1.4 * (retainedEarnings / totalAssets)) +
        (3.3 * (ebit / totalAssets)) +
        (0.6 * (marketCap / (totalLiabilities || 1))) +
        (1.0 * (revenue / totalAssets));
      
      return {
        score: z.toFixed(2),
        interpretation: z > 3 ? 'Safe' : z > 1.8 ? 'Grey Zone' : 'Distress Risk',
        color: z > 3 ? 'green' : z > 1.8 ? 'yellow' : 'red'
      };
    } catch (error) {
      console.error('Error calculating Altman Z-Score:', error);
      return null;
    }
  }

  // Calculate Piotroski F-Score (9-point fundamental strength)
  calculatePiotroskiScore(income: any, balance: any, cashFlow: any) {
    try {
      let score = 0;
      
      if (!income?.annualReports?.[1] || !balance?.annualReports?.[1] || !cashFlow?.annualReports?.[0]) {
        return null;
      }
      
      const currentIncome = income.annualReports[0];
      const previousIncome = income.annualReports[1];
      const currentBalance = balance.annualReports[0];
      const previousBalance = balance.annualReports[1];
      const currentCF = cashFlow.annualReports[0];
      
      // Profitability (4 points)
      // 1. Positive ROA
      const roa = parseFloat(currentIncome.netIncome) / parseFloat(currentBalance.totalAssets);
      if (roa > 0) score++;
      
      // 2. Positive Operating Cash Flow
      if (parseFloat(currentCF.operatingCashflow) > 0) score++;
      
      // 3. Increasing ROA
      const prevRoa = parseFloat(previousIncome.netIncome) / parseFloat(previousBalance.totalAssets);
      if (roa > prevRoa) score++;
      
      // 4. Quality of earnings (Operating CF > Net Income)
      if (parseFloat(currentCF.operatingCashflow) > parseFloat(currentIncome.netIncome)) score++;
      
      // Leverage/Liquidity (3 points)
      // 5. Decreasing long-term debt ratio
      const currentDebtRatio = parseFloat(currentBalance.longTermDebt || 0) / parseFloat(currentBalance.totalAssets);
      const prevDebtRatio = parseFloat(previousBalance.longTermDebt || 0) / parseFloat(previousBalance.totalAssets);
      if (currentDebtRatio < prevDebtRatio) score++;
      
      // 6. Increasing current ratio
      const currentRatio = parseFloat(currentBalance.totalCurrentAssets) / parseFloat(currentBalance.totalCurrentLiabilities);
      const prevCurrentRatio = parseFloat(previousBalance.totalCurrentAssets) / parseFloat(previousBalance.totalCurrentLiabilities);
      if (currentRatio > prevCurrentRatio) score++;
      
      // 7. No new shares issued
      if (parseFloat(currentBalance.commonStockSharesOutstanding) <= parseFloat(previousBalance.commonStockSharesOutstanding)) score++;
      
      // Operating Efficiency (2 points)
      // 8. Increasing gross margin
      const currentGrossMargin = parseFloat(currentIncome.grossProfit) / parseFloat(currentIncome.totalRevenue);
      const prevGrossMargin = parseFloat(previousIncome.grossProfit) / parseFloat(previousIncome.totalRevenue);
      if (currentGrossMargin > prevGrossMargin) score++;
      
      // 9. Increasing asset turnover
      const currentAssetTurnover = parseFloat(currentIncome.totalRevenue) / parseFloat(currentBalance.totalAssets);
      const prevAssetTurnover = parseFloat(previousIncome.totalRevenue) / parseFloat(previousBalance.totalAssets);
      if (currentAssetTurnover > prevAssetTurnover) score++;
      
      return {
        score: score,
        interpretation: score >= 8 ? 'Very Strong' : score >= 5 ? 'Strong' : score >= 3 ? 'Moderate' : 'Weak'
      };
    } catch (error) {
      console.error('Error calculating Piotroski Score:', error);
      return null;
    }
  }

  // Calculate Return on Invested Capital (ROIC)
  calculateROIC(income: any, balance: any) {
    try {
      if (!income?.annualReports?.[0] || !balance?.annualReports?.[0]) {
        return null;
      }
      
      const latestIncome = income.annualReports[0];
      const latestBalance = balance.annualReports[0];
      
      // NOPAT (Net Operating Profit After Tax)
      const ebit = parseFloat(latestIncome.ebit || latestIncome.operatingIncome || 0);
      const taxRate = parseFloat(latestIncome.incomeTaxExpense) / parseFloat(latestIncome.incomeBeforeTax);
      const nopat = ebit * (1 - (isNaN(taxRate) ? 0.21 : taxRate)); // Default 21% tax rate if NaN
      
      // Invested Capital
      const totalDebt = parseFloat(latestBalance.shortTermDebt || 0) + parseFloat(latestBalance.longTermDebt || 0);
      const equity = parseFloat(latestBalance.totalShareholderEquity || 0);
      const cash = parseFloat(latestBalance.cashAndCashEquivalentsAtCarryingValue || 0);
      const investedCapital = totalDebt + equity - cash;
      
      if (!investedCapital || investedCapital <= 0) return null;
      return ((nopat / investedCapital) * 100).toFixed(2);
    } catch (error) {
      console.error('Error calculating ROIC:', error);
      return null;
    }
  }

  // Calculate Free Cash Flow
  calculateFreeCashFlow(cashFlow: any) {
    try {
      if (!cashFlow?.annualReports?.[0]) return null;
      
      const latestYear = cashFlow.annualReports[0];
      const operatingCashFlow = parseFloat(latestYear.operatingCashflow || 0);
      const capEx = Math.abs(parseFloat(latestYear.capitalExpenditures || 0));
      
      return operatingCashFlow - capEx;
    } catch (error) {
      console.error('Error calculating FCF:', error);
      return null;
    }
  }

  // Calculate Free Cash Flow Yield
  calculateFCFYield(overview: any, cashFlow: any) {
    try {
      const fcf = this.calculateFreeCashFlow(cashFlow);
      const marketCap = parseFloat(overview.MarketCapitalization || 0);
      
      if (!marketCap || marketCap <= 0 || !fcf) return null;
      return ((fcf / marketCap) * 100).toFixed(2);
    } catch (error) {
      return null;
    }
  }

  // Calculate Current Ratio
  calculateCurrentRatio(balance: any) {
    try {
      if (!balance?.quarterlyReports?.[0]) return null;
      
      const latest = balance.quarterlyReports[0];
      const currentAssets = parseFloat(latest.totalCurrentAssets || 0);
      const currentLiabilities = parseFloat(latest.totalCurrentLiabilities || 0);
      
      if (!currentLiabilities || currentLiabilities === 0) return null;
      return (currentAssets / currentLiabilities).toFixed(2);
    } catch (error) {
      return null;
    }
  }

  // Calculate Quick Ratio (Acid Test)
  calculateQuickRatio(balance: any) {
    try {
      if (!balance?.quarterlyReports?.[0]) return null;
      
      const latest = balance.quarterlyReports[0];
      const currentAssets = parseFloat(latest.totalCurrentAssets || 0);
      const inventory = parseFloat(latest.inventory || 0);
      const currentLiabilities = parseFloat(latest.totalCurrentLiabilities || 0);
      
      if (!currentLiabilities || currentLiabilities === 0) return null;
      return ((currentAssets - inventory) / currentLiabilities).toFixed(2);
    } catch (error) {
      return null;
    }
  }

  // Calculate Debt to Equity
  calculateDebtToEquity(balance: any) {
    try {
      if (!balance?.quarterlyReports?.[0]) return null;
      
      const latest = balance.quarterlyReports[0];
      const totalDebt = 
        parseFloat(latest.shortTermDebt || 0) + 
        parseFloat(latest.longTermDebt || 0);
      const equity = parseFloat(latest.totalShareholderEquity || 0);
      
      if (!equity || equity <= 0) return null;
      return (totalDebt / equity).toFixed(2);
    } catch (error) {
      return null;
    }
  }
}

export default new MetricsCalculator();
