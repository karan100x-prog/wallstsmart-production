// services/metricsCalculator.ts
// Complete fixed metrics calculator for WallStSmart

interface CompanyOverview {
  MarketCapitalization?: string;
  SharesOutstanding?: string;
  Industry?: string;
  Sector?: string;
}

interface IncomeStatement {
  annualReports?: Array<{
    fiscalDateEnding?: string;
    totalRevenue?: string;
    costOfRevenue?: string;
    grossProfit?: string;
    operatingIncome?: string;
    ebit?: string;
    ebitda?: string;
    netIncome?: string;
    incomeBeforeTax?: string;
    incomeTaxExpense?: string;
  }>;
  quarterlyReports?: Array<any>;
}

interface BalanceSheet {
  annualReports?: Array<{
    fiscalDateEnding?: string;
    totalAssets?: string;
    totalCurrentAssets?: string;
    cashAndCashEquivalentsAtCarryingValue?: string;
    cashAndShortTermInvestments?: string;
    inventory?: string;
    currentNetReceivables?: string;
    totalNonCurrentAssets?: string;
    totalLiabilities?: string;
    totalCurrentLiabilities?: string;
    currentAccountsPayable?: string;
    shortTermDebt?: string;
    currentLongTermDebt?: string;
    totalNonCurrentLiabilities?: string;
    longTermDebt?: string;
    totalShareholderEquity?: string;
    retainedEarnings?: string;
    commonStock?: string;
    commonStockSharesOutstanding?: string;
  }>;
  quarterlyReports?: Array<any>;
}

interface CashFlow {
  annualReports?: Array<{
    fiscalDateEnding?: string;
    operatingCashflow?: string;
    capitalExpenditures?: string;
    dividendPayout?: string;
    cashflowFromInvestment?: string;
    cashflowFromFinancing?: string;
    netIncome?: string;
  }>;
  quarterlyReports?: Array<any>;
}

class MetricsCalculator {
  // Helper function to safely parse float values
  private parseFloat(value: string | number | undefined | null): number {
    if (value === undefined || value === null || value === 'None' || value === '') {
      return 0;
    }
    const parsed = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    return isNaN(parsed) ? 0 : parsed;
  }

  // Calculate Altman Z-Score for public companies
  calculateAltmanZScore(
    overview: CompanyOverview,
    income: IncomeStatement,
    balance: BalanceSheet
  ): { score: string; interpretation: string; components: any } {
    try {
      // Get the most recent annual reports
      const latestBalance = balance?.annualReports?.[0];
      const latestIncome = income?.annualReports?.[0];
      
      if (!latestBalance || !latestIncome) {
        return {
          score: '0.00',
          interpretation: 'Insufficient Data',
          components: {}
        };
      }

      // Extract required values
      const totalAssets = this.parseFloat(latestBalance.totalAssets);
      const totalLiabilities = this.parseFloat(latestBalance.totalLiabilities);
      const currentAssets = this.parseFloat(latestBalance.totalCurrentAssets);
      const currentLiabilities = this.parseFloat(latestBalance.totalCurrentLiabilities);
      const retainedEarnings = this.parseFloat(latestBalance.retainedEarnings);
      const revenue = this.parseFloat(latestIncome.totalRevenue);
      
      // For EBIT, try multiple fields in order of preference
      const ebit = this.parseFloat(latestIncome.ebit) || 
                   this.parseFloat(latestIncome.operatingIncome) ||
                   this.parseFloat(latestIncome.ebitda);
      
      // Market capitalization from overview
      const marketCap = this.parseFloat(overview?.MarketCapitalization);
      
      // Avoid division by zero
      if (totalAssets === 0) {
        return {
          score: '0.00',
          interpretation: 'Invalid Data (No Assets)',
          components: {}
        };
      }

      // Calculate Altman Z-Score components
      const workingCapital = currentAssets - currentLiabilities;
      
      // A = Working Capital / Total Assets
      const A = workingCapital / totalAssets;
      
      // B = Retained Earnings / Total Assets
      const B = retainedEarnings / totalAssets;
      
      // C = EBIT / Total Assets
      const C = ebit / totalAssets;
      
      // D = Market Value of Equity / Total Liabilities
      const D = totalLiabilities > 0 ? (marketCap / totalLiabilities) : 0;
      
      // E = Sales / Total Assets
      const E = revenue / totalAssets;
      
      // Calculate Z-Score using the Altman formula weights
      const zScore = (1.2 * A) + (1.4 * B) + (3.3 * C) + (0.6 * D) + (1.0 * E);
      
      // Interpret the score
      let interpretation = '';
      if (zScore > 2.99) {
        interpretation = 'Safe Zone - Low Bankruptcy Risk';
      } else if (zScore >= 1.81 && zScore <= 2.99) {
        interpretation = 'Grey Zone - Moderate Risk';
      } else if (zScore < 1.81) {
        interpretation = 'Distress Zone - High Bankruptcy Risk';
      }

      return {
        score: zScore.toFixed(2),
        interpretation,
        components: {
          A: A.toFixed(4),
          B: B.toFixed(4),
          C: C.toFixed(4),
          D: D.toFixed(4),
          E: E.toFixed(4),
          workingCapital: workingCapital,
          totalAssets: totalAssets,
          marketCap: marketCap
        }
      };
    } catch (error) {
      console.error('Error calculating Altman Z-Score:', error);
      return {
        score: '0.00',
        interpretation: 'Calculation Error',
        components: {}
      };
    }
  }

  // Calculate Piotroski F-Score
  calculatePiotroskiScore(
    income: IncomeStatement,
    balance: BalanceSheet,
    cashFlow: CashFlow
  ): { score: number; criteria: Array<{ name: string; passed: boolean }> } {
    let score = 0;
    const criteria: Array<{ name: string; passed: boolean }> = [];
    
    try {
      // Get current and previous year data
      const currentIncome = income?.annualReports?.[0];
      const prevIncome = income?.annualReports?.[1];
      const currentBalance = balance?.annualReports?.[0];
      const prevBalance = balance?.annualReports?.[1];
      const currentCashFlow = cashFlow?.annualReports?.[0];
      
      if (!currentIncome || !currentBalance || !currentCashFlow) {
        return { score: 0, criteria: [] };
      }

      // 1. Positive Net Income (Profitability)
      const netIncome = this.parseFloat(currentIncome.netIncome);
      if (netIncome > 0) {
        score++;
        criteria.push({ name: 'Positive Net Income', passed: true });
      } else {
        criteria.push({ name: 'Positive Net Income', passed: false });
      }

      // 2. Positive Operating Cash Flow
      const operatingCashFlow = this.parseFloat(currentCashFlow.operatingCashflow);
      if (operatingCashFlow > 0) {
        score++;
        criteria.push({ name: 'Positive Operating Cash Flow', passed: true });
      } else {
        criteria.push({ name: 'Positive Operating Cash Flow', passed: false });
      }

      // 3. Increasing ROA (Return on Assets)
      if (prevIncome && prevBalance) {
        const currentAssets = this.parseFloat(currentBalance.totalAssets);
        const prevAssets = this.parseFloat(prevBalance.totalAssets);
        const prevNetIncome = this.parseFloat(prevIncome.netIncome);
        
        const currentROA = currentAssets > 0 ? netIncome / currentAssets : 0;
        const prevROA = prevAssets > 0 ? prevNetIncome / prevAssets : 0;
        
        if (currentROA > prevROA) {
          score++;
          criteria.push({ name: 'Improving ROA', passed: true });
        } else {
          criteria.push({ name: 'Improving ROA', passed: false });
        }
      }

      // 4. Quality of Earnings (Operating Cash Flow > Net Income)
      if (operatingCashFlow > netIncome) {
        score++;
        criteria.push({ name: 'Quality Earnings', passed: true });
      } else {
        criteria.push({ name: 'Quality Earnings', passed: false });
      }

      // 5. Decreasing Long-term Debt
      if (prevBalance) {
        const currentLTDebt = this.parseFloat(currentBalance.longTermDebt);
        const prevLTDebt = this.parseFloat(prevBalance.longTermDebt);
        
        if (currentLTDebt <= prevLTDebt) {
          score++;
          criteria.push({ name: 'Decreasing Debt', passed: true });
        } else {
          criteria.push({ name: 'Decreasing Debt', passed: false });
        }
      }

      // 6. Increasing Current Ratio
      if (prevBalance) {
        const currentCA = this.parseFloat(currentBalance.totalCurrentAssets);
        const currentCL = this.parseFloat(currentBalance.totalCurrentLiabilities);
        const prevCA = this.parseFloat(prevBalance.totalCurrentAssets);
        const prevCL = this.parseFloat(prevBalance.totalCurrentLiabilities);
        
        const currentRatio = currentCL > 0 ? currentCA / currentCL : 0;
        const prevRatio = prevCL > 0 ? prevCA / prevCL : 0;
        
        if (currentRatio > prevRatio) {
          score++;
          criteria.push({ name: 'Improving Liquidity', passed: true });
        } else {
          criteria.push({ name: 'Improving Liquidity', passed: false });
        }
      }

      // 7. No New Shares Issued
      if (prevBalance) {
        const currentShares = this.parseFloat(currentBalance.commonStockSharesOutstanding);
        const prevShares = this.parseFloat(prevBalance.commonStockSharesOutstanding);
        
        if (currentShares <= prevShares * 1.05) { // Allow 5% tolerance
          score++;
          criteria.push({ name: 'No Dilution', passed: true });
        } else {
          criteria.push({ name: 'No Dilution', passed: false });
        }
      }

      // 8. Increasing Gross Margin
      if (prevIncome) {
        const currentRevenue = this.parseFloat(currentIncome.totalRevenue);
        const currentGrossProfit = this.parseFloat(currentIncome.grossProfit);
        const prevRevenue = this.parseFloat(prevIncome.totalRevenue);
        const prevGrossProfit = this.parseFloat(prevIncome.grossProfit);
        
        const currentGrossMargin = currentRevenue > 0 ? currentGrossProfit / currentRevenue : 0;
        const prevGrossMargin = prevRevenue > 0 ? prevGrossProfit / prevRevenue : 0;
        
        if (currentGrossMargin > prevGrossMargin) {
          score++;
          criteria.push({ name: 'Improving Margins', passed: true });
        } else {
          criteria.push({ name: 'Improving Margins', passed: false });
        }
      }

      // 9. Increasing Asset Turnover
      if (prevIncome && prevBalance) {
        const currentRevenue = this.parseFloat(currentIncome.totalRevenue);
        const currentAssets = this.parseFloat(currentBalance.totalAssets);
        const prevRevenue = this.parseFloat(prevIncome.totalRevenue);
        const prevAssets = this.parseFloat(prevBalance.totalAssets);
        
        const currentTurnover = currentAssets > 0 ? currentRevenue / currentAssets : 0;
        const prevTurnover = prevAssets > 0 ? prevRevenue / prevAssets : 0;
        
        if (currentTurnover > prevTurnover) {
          score++;
          criteria.push({ name: 'Improving Efficiency', passed: true });
        } else {
          criteria.push({ name: 'Improving Efficiency', passed: false });
        }
      }

    } catch (error) {
      console.error('Error calculating Piotroski Score:', error);
    }

    return { score, criteria };
  }

  // Calculate Free Cash Flow
  calculateFreeCashFlow(cashFlow: CashFlow): number {
    try {
      const latest = cashFlow?.annualReports?.[0];
      if (!latest) return 0;
      
      const operatingCashFlow = this.parseFloat(latest.operatingCashflow);
      const capitalExpenditures = Math.abs(this.parseFloat(latest.capitalExpenditures));
      
      return operatingCashFlow - capitalExpenditures;
    } catch (error) {
      console.error('Error calculating FCF:', error);
      return 0;
    }
  }

  // Calculate FCF Yield
  calculateFCFYield(overview: CompanyOverview, cashFlow: CashFlow): string {
    try {
      const fcf = this.calculateFreeCashFlow(cashFlow);
      const marketCap = this.parseFloat(overview?.MarketCapitalization);
      
      if (marketCap === 0) return '0.00';
      
      const fcfYield = (fcf / marketCap) * 100;
      return fcfYield.toFixed(2);
    } catch (error) {
      console.error('Error calculating FCF Yield:', error);
      return '0.00';
    }
  }

  // Calculate ROIC (Return on Invested Capital)
  calculateROIC(income: IncomeStatement, balance: BalanceSheet): string {
    try {
      const latestIncome = income?.annualReports?.[0];
      const latestBalance = balance?.annualReports?.[0];
      
      if (!latestIncome || !latestBalance) return '0.00';
      
      // Get EBIT (or Operating Income as fallback)
      const ebit = this.parseFloat(latestIncome.ebit) || 
                   this.parseFloat(latestIncome.operatingIncome) || 0;
      
      // Calculate tax rate
      const incomeBeforeTax = this.parseFloat(latestIncome.incomeBeforeTax);
      const incomeTaxExpense = this.parseFloat(latestIncome.incomeTaxExpense);
      const taxRate = incomeBeforeTax > 0 ? incomeTaxExpense / incomeBeforeTax : 0.21; // Default 21% if can't calculate
      
      // NOPAT (Net Operating Profit After Tax)
      const nopat = ebit * (1 - taxRate);
      
      // Invested Capital = Total Assets - Current Liabilities (excluding short-term debt)
      const totalAssets = this.parseFloat(latestBalance.totalAssets);
      const currentLiabilities = this.parseFloat(latestBalance.totalCurrentLiabilities);
      const shortTermDebt = this.parseFloat(latestBalance.shortTermDebt) || 0;
      
      const investedCapital = totalAssets - (currentLiabilities - shortTermDebt);
      
      if (investedCapital <= 0) return '0.00';
      
      const roic = (nopat / investedCapital) * 100;
      return roic.toFixed(2);
    } catch (error) {
      console.error('Error calculating ROIC:', error);
      return '0.00';
    }
  }

  // Calculate Current Ratio
  calculateCurrentRatio(balance: BalanceSheet): string {
    try {
      const latest = balance?.annualReports?.[0];
      if (!latest) return '0.00';
      
      const currentAssets = this.parseFloat(latest.totalCurrentAssets);
      const currentLiabilities = this.parseFloat(latest.totalCurrentLiabilities);
      
      if (currentLiabilities === 0) return '0.00';
      
      return (currentAssets / currentLiabilities).toFixed(2);
    } catch (error) {
      console.error('Error calculating Current Ratio:', error);
      return '0.00';
    }
  }

  // Calculate Quick Ratio (Acid Test)
  calculateQuickRatio(balance: BalanceSheet): string {
    try {
      const latest = balance?.annualReports?.[0];
      if (!latest) return '0.00';
      
      const currentAssets = this.parseFloat(latest.totalCurrentAssets);
      const inventory = this.parseFloat(latest.inventory);
      const currentLiabilities = this.parseFloat(latest.totalCurrentLiabilities);
      
      if (currentLiabilities === 0) return '0.00';
      
      const quickAssets = currentAssets - inventory;
      return (quickAssets / currentLiabilities).toFixed(2);
    } catch (error) {
      console.error('Error calculating Quick Ratio:', error);
      return '0.00';
    }
  }

  // Calculate Debt-to-Equity Ratio
  calculateDebtToEquity(balance: BalanceSheet): string {
    try {
      const latest = balance?.annualReports?.[0];
      if (!latest) return '0.00';
      
      const shortTermDebt = this.parseFloat(latest.shortTermDebt) || 0;
      const currentLongTermDebt = this.parseFloat(latest.currentLongTermDebt) || 0;
      const longTermDebt = this.parseFloat(latest.longTermDebt) || 0;
      const totalDebt = shortTermDebt + currentLongTermDebt + longTermDebt;
      
      const equity = this.parseFloat(latest.totalShareholderEquity);
      
      if (equity === 0) return '999.99'; // Max value for infinite debt/equity
      
      return (totalDebt / equity).toFixed(2);
    } catch (error) {
      console.error('Error calculating Debt to Equity:', error);
      return '0.00';
    }
  }
}

// Export singleton instance
const metricsCalculator = new MetricsCalculator();
export default metricsCalculator;
