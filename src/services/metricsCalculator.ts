// services/metricsCalculator.ts
// Verified financial metrics calculator with correct formulas

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
    longTermDebtNoncurrent?: string;
    shortLongTermDebtTotal?: string;
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

  /**
   * ALTMAN Z-SCORE (for public companies)
   * Formula: Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
   * Where:
   * A = Working Capital / Total Assets
   * B = Retained Earnings / Total Assets
   * C = EBIT / Total Assets
   * D = Market Value of Equity / Total Liabilities
   * E = Sales / Total Assets
   */
  calculateAltmanZScore(
    overview: CompanyOverview,
    income: IncomeStatement,
    balance: BalanceSheet
  ): { score: string; interpretation: string; components: any } {
    try {
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
      
      // EBIT calculation - try multiple fields
      const ebit = this.parseFloat(latestIncome.ebit) || 
                   this.parseFloat(latestIncome.operatingIncome) ||
                   (this.parseFloat(latestIncome.incomeBeforeTax) + this.parseFloat(latestIncome.incomeTaxExpense));
      
      // Market capitalization
      const marketCap = this.parseFloat(overview?.MarketCapitalization);
      
      // Validation
      if (totalAssets === 0) {
        return {
          score: '0.00',
          interpretation: 'Invalid Data (No Assets)',
          components: {}
        };
      }

      // Calculate components
      const workingCapital = currentAssets - currentLiabilities;
      
      const A = workingCapital / totalAssets;
      const B = retainedEarnings / totalAssets;
      const C = ebit / totalAssets;
      const D = totalLiabilities > 0 ? (marketCap / totalLiabilities) : 0;
      const E = revenue / totalAssets;
      
      // Calculate Z-Score
      const zScore = (1.2 * A) + (1.4 * B) + (3.3 * C) + (0.6 * D) + (1.0 * E);
      
      // Interpretation
      let interpretation = '';
      if (zScore > 2.99) {
        interpretation = 'Safe Zone - Low Bankruptcy Risk';
      } else if (zScore >= 1.81) {
        interpretation = 'Grey Zone - Moderate Risk';
      } else {
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

  /**
   * PIOTROSKI F-SCORE
   * 9-point scoring system for fundamental strength
   */
  calculatePiotroskiScore(
    income: IncomeStatement,
    balance: BalanceSheet,
    cashFlow: CashFlow
  ): { score: number; criteria: Array<{ name: string; passed: boolean }> } {
    let score = 0;
    const criteria: Array<{ name: string; passed: boolean }> = [];
    
    try {
      const currentIncome = income?.annualReports?.[0];
      const prevIncome = income?.annualReports?.[1];
      const currentBalance = balance?.annualReports?.[0];
      const prevBalance = balance?.annualReports?.[1];
      const currentCashFlow = cashFlow?.annualReports?.[0];
      
      if (!currentIncome || !currentBalance || !currentCashFlow) {
        return { score: 0, criteria: [] };
      }

      // === PROFITABILITY SIGNALS (4 points) ===
      
      // 1. Net Income > 0
      const netIncome = this.parseFloat(currentIncome.netIncome);
      if (netIncome > 0) {
        score++;
        criteria.push({ name: 'Positive Net Income', passed: true });
      } else {
        criteria.push({ name: 'Positive Net Income', passed: false });
      }

      // 2. Operating Cash Flow > 0
      const operatingCashFlow = this.parseFloat(currentCashFlow.operatingCashflow);
      if (operatingCashFlow > 0) {
        score++;
        criteria.push({ name: 'Positive Cash Flow', passed: true });
      } else {
        criteria.push({ name: 'Positive Cash Flow', passed: false });
      }

      // 3. ROA increasing
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

      // 4. Quality of Earnings (OCF > Net Income)
      if (operatingCashFlow > netIncome) {
        score++;
        criteria.push({ name: 'Quality Earnings', passed: true });
      } else {
        criteria.push({ name: 'Quality Earnings', passed: false });
      }

      // === LEVERAGE, LIQUIDITY & SOURCE OF FUNDS (3 points) ===
      
      // 5. Long-term Debt decreasing
      if (prevBalance) {
        const currentLTDebt = this.parseFloat(currentBalance.longTermDebt) || 
                              this.parseFloat(currentBalance.longTermDebtNoncurrent) || 0;
        const prevLTDebt = this.parseFloat(prevBalance.longTermDebt) || 
                           this.parseFloat(prevBalance.longTermDebtNoncurrent) || 0;
        
        if (currentLTDebt <= prevLTDebt) {
          score++;
          criteria.push({ name: 'Decreasing Debt', passed: true });
        } else {
          criteria.push({ name: 'Decreasing Debt', passed: false });
        }
      }

      // 6. Current Ratio increasing
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

      // 7. No new shares issued
      if (prevBalance) {
        const currentShares = this.parseFloat(currentBalance.commonStockSharesOutstanding);
        const prevShares = this.parseFloat(prevBalance.commonStockSharesOutstanding);
        
        // Allow 2% tolerance for rounding/splits
        if (currentShares <= prevShares * 1.02) {
          score++;
          criteria.push({ name: 'No Dilution', passed: true });
        } else {
          criteria.push({ name: 'No Dilution', passed: false });
        }
      }

      // === OPERATING EFFICIENCY (2 points) ===
      
      // 8. Gross Margin increasing
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

      // 9. Asset Turnover increasing
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

  /**
   * FREE CASH FLOW
   * Formula: Operating Cash Flow - Capital Expenditures
   */
  calculateFreeCashFlow(cashFlow: CashFlow): number {
    try {
      const latest = cashFlow?.annualReports?.[0];
      if (!latest) return 0;
      
      const operatingCashFlow = this.parseFloat(latest.operatingCashflow);
      // Capital expenditures are typically negative in cash flow statements
      const capitalExpenditures = Math.abs(this.parseFloat(latest.capitalExpenditures));
      
      return operatingCashFlow - capitalExpenditures;
    } catch (error) {
      console.error('Error calculating FCF:', error);
      return 0;
    }
  }

  /**
   * FREE CASH FLOW YIELD
   * Formula: (Free Cash Flow / Market Capitalization) × 100
   */
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

  /**
   * RETURN ON INVESTED CAPITAL (ROIC)
   * Formula: NOPAT / Invested Capital
   * NOPAT = EBIT × (1 - Tax Rate)
   * Invested Capital = Total Assets - Current Liabilities (excluding short-term debt) + Short-term Debt
   */
  calculateROIC(income: IncomeStatement, balance: BalanceSheet): string {
    try {
      const latestIncome = income?.annualReports?.[0];
      const latestBalance = balance?.annualReports?.[0];
      
      if (!latestIncome || !latestBalance) return '0.00';
      
      // Get EBIT
      const ebit = this.parseFloat(latestIncome.ebit) || 
                   this.parseFloat(latestIncome.operatingIncome) ||
                   (this.parseFloat(latestIncome.incomeBeforeTax) + this.parseFloat(latestIncome.incomeTaxExpense));
      
      // Calculate effective tax rate
      const incomeBeforeTax = this.parseFloat(latestIncome.incomeBeforeTax);
      const incomeTaxExpense = this.parseFloat(latestIncome.incomeTaxExpense);
      const taxRate = incomeBeforeTax > 0 ? incomeTaxExpense / incomeBeforeTax : 0.21;
      
      // NOPAT
      const nopat = ebit * (1 - taxRate);
      
      // Invested Capital = Total Assets - Non-interest bearing current liabilities
      const totalAssets = this.parseFloat(latestBalance.totalAssets);
      const currentLiabilities = this.parseFloat(latestBalance.totalCurrentLiabilities);
      const shortTermDebt = this.parseFloat(latestBalance.shortTermDebt) || 0;
      
      // Add back short-term debt to invested capital (it's interest-bearing)
      const investedCapital = totalAssets - currentLiabilities + shortTermDebt;
      
      if (investedCapital <= 0) return '0.00';
      
      const roic = (nopat / investedCapital) * 100;
      return roic.toFixed(2);
    } catch (error) {
      console.error('Error calculating ROIC:', error);
      return '0.00';
    }
  }

  /**
   * CURRENT RATIO
   * Formula: Current Assets / Current Liabilities
   * Good benchmark: > 1.5
   */
  calculateCurrentRatio(balance: BalanceSheet): string {
    try {
      const latest = balance?.annualReports?.[0];
      if (!latest) return '0.00';
      
      const currentAssets = this.parseFloat(latest.totalCurrentAssets);
      const currentLiabilities = this.parseFloat(latest.totalCurrentLiabilities);
      
      if (currentLiabilities === 0) return '999.99';
      
      return (currentAssets / currentLiabilities).toFixed(2);
    } catch (error) {
      console.error('Error calculating Current Ratio:', error);
      return '0.00';
    }
  }

  /**
   * QUICK RATIO (ACID TEST)
   * Formula: (Current Assets - Inventory) / Current Liabilities
   * Good benchmark: > 1.0
   */
  calculateQuickRatio(balance: BalanceSheet): string {
    try {
      const latest = balance?.annualReports?.[0];
      if (!latest) return '0.00';
      
      const currentAssets = this.parseFloat(latest.totalCurrentAssets);
      const inventory = this.parseFloat(latest.inventory) || 0;
      const currentLiabilities = this.parseFloat(latest.totalCurrentLiabilities);
      
      if (currentLiabilities === 0) return '999.99';
      
      const quickAssets = currentAssets - inventory;
      return (quickAssets / currentLiabilities).toFixed(2);
    } catch (error) {
      console.error('Error calculating Quick Ratio:', error);
      return '0.00';
    }
  }

  /**
   * DEBT-TO-EQUITY RATIO
   * Formula: Total Debt / Total Shareholders' Equity
   * 
   * CORRECTED: We should use TOTAL LIABILITIES or TOTAL DEBT, not just long-term debt
   * 
   * Option 1 (Conservative): Total Liabilities / Shareholders' Equity
   * Option 2 (Traditional): (Short-term Debt + Long-term Debt) / Shareholders' Equity
   * 
   * Good benchmark: < 1.0 (varies by industry)
   */
  calculateDebtToEquity(balance: BalanceSheet): string {
    try {
      const latest = balance?.annualReports?.[0];
      if (!latest) return '0.00';
      
      // Method 1: Using Total Liabilities (most conservative)
      // const totalLiabilities = this.parseFloat(latest.totalLiabilities);
      
      // Method 2: Using only interest-bearing debt (more accurate)
      // This is the preferred method as it focuses on actual debt, not all liabilities
      const shortTermDebt = this.parseFloat(latest.shortTermDebt) || 0;
      const currentLongTermDebt = this.parseFloat(latest.currentLongTermDebt) || 0;
      const longTermDebt = this.parseFloat(latest.longTermDebt) || 
                           this.parseFloat(latest.longTermDebtNoncurrent) || 0;
      
      // Some companies report shortLongTermDebtTotal which includes everything
      const totalDebtAlternative = this.parseFloat(latest.shortLongTermDebtTotal);
      
      // Use the alternative total if available, otherwise sum components
      const totalDebt = totalDebtAlternative || (shortTermDebt + currentLongTermDebt + longTermDebt);
      
      const shareholderEquity = this.parseFloat(latest.totalShareholderEquity);
      
      // Handle edge cases
      if (shareholderEquity === 0) {
        return '999.99'; // Infinite or undefined
      }
      
      if (shareholderEquity < 0) {
        // Negative equity is a serious red flag
        return '-999.99';
      }
      
      const debtToEquity = totalDebt / shareholderEquity;
      
      // Cap at reasonable maximum for display
      if (debtToEquity > 999.99) {
        return '999.99';
      }
      
      return debtToEquity.toFixed(2);
    } catch (error) {
      console.error('Error calculating Debt to Equity:', error);
      return '0.00';
    }
  }

  /**
   * Additional helper method to get interpretation for Debt/Equity ratio
   */
  getDebtToEquityInterpretation(debtToEquity: string): string {
    const value = parseFloat(debtToEquity);
    
    if (value < 0) {
      return 'Negative Equity - Critical';
    } else if (value === 0) {
      return 'No Debt - Excellent';
    } else if (value < 0.3) {
      return 'Very Low Leverage - Conservative';
    } else if (value < 0.5) {
      return 'Low Leverage - Strong';
    } else if (value < 1.0) {
      return 'Moderate Leverage - Healthy';
    } else if (value < 2.0) {
      return 'High Leverage - Monitor';
    } else if (value < 5.0) {
      return 'Very High Leverage - Risky';
    } else {
      return 'Excessive Leverage - Critical';
    }
  }
}

// Export singleton instance
const metricsCalculator = new MetricsCalculator();
export default metricsCalculator;
