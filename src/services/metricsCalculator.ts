// services/metricsCalculator.ts
// Production-ready financial metrics calculator with verified formulas

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
   * 
   * Interpretation:
   * Z > 2.99 = Safe Zone (Low bankruptcy risk)
   * 1.81 < Z < 2.99 = Grey Zone (Moderate risk)
   * Z < 1.81 = Distress Zone (High bankruptcy risk)
   */
  calculateAltmanZScore(
    overview: CompanyOverview,
    income: IncomeStatement,
    balance: BalanceSheet
  ): { score: string; interpretation: string; components: any; color: string } {
    try {
      const latestBalance = balance?.annualReports?.[0];
      const latestIncome = income?.annualReports?.[0];
      
      if (!latestBalance || !latestIncome) {
        console.error('Missing data for Z-Score calculation');
        return {
          score: '0.00',
          interpretation: 'Insufficient Data',
          components: {},
          color: '#6B7280' // gray
        };
      }

      // Extract required values
      const totalAssets = this.parseFloat(latestBalance.totalAssets);
      const totalLiabilities = this.parseFloat(latestBalance.totalLiabilities);
      const currentAssets = this.parseFloat(latestBalance.totalCurrentAssets);
      const currentLiabilities = this.parseFloat(latestBalance.totalCurrentLiabilities);
      const retainedEarnings = this.parseFloat(latestBalance.retainedEarnings);
      const revenue = this.parseFloat(latestIncome.totalRevenue);
      
      // EBIT calculation - try multiple fields in order of preference
      let ebit = this.parseFloat(latestIncome.ebit);
      if (ebit === 0) {
        ebit = this.parseFloat(latestIncome.operatingIncome);
      }
      if (ebit === 0) {
        const incomeBeforeTax = this.parseFloat(latestIncome.incomeBeforeTax);
        const interestExpense = this.parseFloat(latestIncome.interestExpense) || 0;
        ebit = incomeBeforeTax + interestExpense;
      }
      
      // Market capitalization
      const marketCap = this.parseFloat(overview?.MarketCapitalization);
      
      // Validation
      if (totalAssets === 0) {
        console.error('Total assets is zero');
        return {
          score: '0.00',
          interpretation: 'Invalid Data (No Assets)',
          components: {},
          color: '#EF4444' // red
        };
      }

      if (totalLiabilities === 0) {
        console.error('Total liabilities is zero');
        return {
          score: '0.00',
          interpretation: 'Invalid Data (No Liabilities)',
          components: {},
          color: '#EF4444' // red
        };
      }

      // Calculate components
      const workingCapital = currentAssets - currentLiabilities;
      
      const A = workingCapital / totalAssets;
      const B = retainedEarnings / totalAssets;
      const C = ebit / totalAssets;
      const D = marketCap / totalLiabilities;
      const E = revenue / totalAssets;
      
      // Calculate Z-Score with proper formula
      const zScore = (1.2 * A) + (1.4 * B) + (3.3 * C) + (0.6 * D) + (1.0 * E);
      
      // Debug logging
      console.log('Z-Score Calculation Debug:', {
        inputs: {
          totalAssets,
          totalLiabilities,
          currentAssets,
          currentLiabilities,
          retainedEarnings,
          revenue,
          ebit,
          marketCap,
          workingCapital
        },
        components: {
          A: { value: A, weighted: 1.2 * A },
          B: { value: B, weighted: 1.4 * B },
          C: { value: C, weighted: 3.3 * C },
          D: { value: D, weighted: 0.6 * D },
          E: { value: E, weighted: 1.0 * E }
        },
        finalScore: zScore
      });
      
      // Interpretation and color coding
      let interpretation = '';
      let color = '';
      
      if (zScore > 2.99) {
        interpretation = 'Safe Zone - Low Bankruptcy Risk';
        color = '#10B981'; // green
      } else if (zScore >= 1.81) {
        interpretation = 'Grey Zone - Moderate Risk';
        color = '#F59E0B'; // yellow
      } else {
        interpretation = 'Distress Zone - High Bankruptcy Risk';
        color = '#EF4444'; // red
      }

      // Cap the score display at reasonable bounds
      const displayScore = Math.min(Math.max(zScore, -10), 20);

      return {
        score: displayScore.toFixed(2),
        interpretation,
        components: {
          A: A.toFixed(4),
          B: B.toFixed(4),
          C: C.toFixed(4),
          D: D.toFixed(4),
          E: E.toFixed(4),
          workingCapital: workingCapital.toFixed(0),
          totalAssets: totalAssets.toFixed(0),
          totalLiabilities: totalLiabilities.toFixed(0),
          marketCap: marketCap.toFixed(0),
          ebit: ebit.toFixed(0),
          revenue: revenue.toFixed(0),
          retainedEarnings: retainedEarnings.toFixed(0)
        },
        color
      };
    } catch (error) {
      console.error('Error calculating Altman Z-Score:', error);
      return {
        score: '0.00',
        interpretation: 'Calculation Error',
        components: {},
        color: '#EF4444'
      };
    }
  }

  /**
   * PIOTROSKI F-SCORE
   * 9-point scoring system for fundamental strength
   * Score interpretation:
   * 8-9: Strong fundamentals
   * 5-7: Moderate fundamentals
   * 0-4: Weak fundamentals
   */
  calculatePiotroskiScore(
    income: IncomeStatement,
    balance: BalanceSheet,
    cashFlow: CashFlow
  ): { score: number; maxScore: number; criteria: Array<{ name: string; passed: boolean; category: string }> } {
    let score = 0;
    const criteria: Array<{ name: string; passed: boolean; category: string }> = [];
    
    try {
      const currentIncome = income?.annualReports?.[0];
      const prevIncome = income?.annualReports?.[1];
      const currentBalance = balance?.annualReports?.[0];
      const prevBalance = balance?.annualReports?.[1];
      const currentCashFlow = cashFlow?.annualReports?.[0];
      
      if (!currentIncome || !currentBalance || !currentCashFlow) {
        console.error('Missing data for Piotroski Score');
        return { score: 0, maxScore: 9, criteria: [] };
      }

      // === PROFITABILITY SIGNALS (4 points) ===
      
      // 1. Net Income > 0
      const netIncome = this.parseFloat(currentIncome.netIncome);
      const profitPositive = netIncome > 0;
      if (profitPositive) score++;
      criteria.push({ 
        name: 'Positive Net Income', 
        passed: profitPositive,
        category: 'Profitability'
      });

      // 2. Operating Cash Flow > 0
      const operatingCashFlow = this.parseFloat(currentCashFlow.operatingCashflow);
      const cashFlowPositive = operatingCashFlow > 0;
      if (cashFlowPositive) score++;
      criteria.push({ 
        name: 'Positive Operating Cash Flow', 
        passed: cashFlowPositive,
        category: 'Profitability'
      });

      // 3. ROA increasing
      let roaImproving = false;
      if (prevIncome && prevBalance) {
        const currentAssets = this.parseFloat(currentBalance.totalAssets);
        const prevAssets = this.parseFloat(prevBalance.totalAssets);
        const prevNetIncome = this.parseFloat(prevIncome.netIncome);
        
        const currentROA = currentAssets > 0 ? netIncome / currentAssets : 0;
        const prevROA = prevAssets > 0 ? prevNetIncome / prevAssets : 0;
        
        roaImproving = currentROA > prevROA;
        if (roaImproving) score++;
      }
      criteria.push({ 
        name: 'Improving Return on Assets', 
        passed: roaImproving,
        category: 'Profitability'
      });

      // 4. Quality of Earnings (OCF > Net Income)
      const qualityEarnings = operatingCashFlow > netIncome;
      if (qualityEarnings) score++;
      criteria.push({ 
        name: 'Quality Earnings (Cash > Net Income)', 
        passed: qualityEarnings,
        category: 'Profitability'
      });

      // === LEVERAGE, LIQUIDITY & SOURCE OF FUNDS (3 points) ===
      
      // 5. Long-term Debt decreasing
      let debtDecreasing = false;
      if (prevBalance) {
        const currentLTDebt = this.parseFloat(currentBalance.longTermDebt) || 
                              this.parseFloat(currentBalance.longTermDebtNoncurrent) || 0;
        const prevLTDebt = this.parseFloat(prevBalance.longTermDebt) || 
                           this.parseFloat(prevBalance.longTermDebtNoncurrent) || 0;
        
        debtDecreasing = currentLTDebt <= prevLTDebt;
        if (debtDecreasing) score++;
      }
      criteria.push({ 
        name: 'Decreasing Long-term Debt', 
        passed: debtDecreasing,
        category: 'Leverage'
      });

      // 6. Current Ratio increasing
      let liquidityImproving = false;
      if (prevBalance) {
        const currentCA = this.parseFloat(currentBalance.totalCurrentAssets);
        const currentCL = this.parseFloat(currentBalance.totalCurrentLiabilities);
        const prevCA = this.parseFloat(prevBalance.totalCurrentAssets);
        const prevCL = this.parseFloat(prevBalance.totalCurrentLiabilities);
        
        const currentRatio = currentCL > 0 ? currentCA / currentCL : 0;
        const prevRatio = prevCL > 0 ? prevCA / prevCL : 0;
        
        liquidityImproving = currentRatio > prevRatio;
        if (liquidityImproving) score++;
      }
      criteria.push({ 
        name: 'Improving Current Ratio', 
        passed: liquidityImproving,
        category: 'Leverage'
      });

      // 7. No new shares issued
      let noDilution = false;
      if (prevBalance) {
        const currentShares = this.parseFloat(currentBalance.commonStockSharesOutstanding);
        const prevShares = this.parseFloat(prevBalance.commonStockSharesOutstanding);
        
        // Allow 2% tolerance for rounding/splits
        noDilution = currentShares <= prevShares * 1.02;
        if (noDilution) score++;
      }
      criteria.push({ 
        name: 'No Share Dilution', 
        passed: noDilution,
        category: 'Leverage'
      });

      // === OPERATING EFFICIENCY (2 points) ===
      
      // 8. Gross Margin increasing
      let marginsImproving = false;
      if (prevIncome) {
        const currentRevenue = this.parseFloat(currentIncome.totalRevenue);
        const currentGrossProfit = this.parseFloat(currentIncome.grossProfit);
        const prevRevenue = this.parseFloat(prevIncome.totalRevenue);
        const prevGrossProfit = this.parseFloat(prevIncome.grossProfit);
        
        const currentGrossMargin = currentRevenue > 0 ? currentGrossProfit / currentRevenue : 0;
        const prevGrossMargin = prevRevenue > 0 ? prevGrossProfit / prevRevenue : 0;
        
        marginsImproving = currentGrossMargin > prevGrossMargin;
        if (marginsImproving) score++;
      }
      criteria.push({ 
        name: 'Improving Gross Margins', 
        passed: marginsImproving,
        category: 'Efficiency'
      });

      // 9. Asset Turnover increasing
      let efficiencyImproving = false;
      if (prevIncome && prevBalance) {
        const currentRevenue = this.parseFloat(currentIncome.totalRevenue);
        const currentAssets = this.parseFloat(currentBalance.totalAssets);
        const prevRevenue = this.parseFloat(prevIncome.totalRevenue);
        const prevAssets = this.parseFloat(prevBalance.totalAssets);
        
        const currentTurnover = currentAssets > 0 ? currentRevenue / currentAssets : 0;
        const prevTurnover = prevAssets > 0 ? prevRevenue / prevAssets : 0;
        
        efficiencyImproving = currentTurnover > prevTurnover;
        if (efficiencyImproving) score++;
      }
      criteria.push({ 
        name: 'Improving Asset Turnover', 
        passed: efficiencyImproving,
        category: 'Efficiency'
      });

    } catch (error) {
      console.error('Error calculating Piotroski Score:', error);
    }

    return { score, maxScore: 9, criteria };
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
      let ebit = this.parseFloat(latestIncome.ebit);
      if (ebit === 0) {
        ebit = this.parseFloat(latestIncome.operatingIncome);
      }
      if (ebit === 0) {
        const incomeBeforeTax = this.parseFloat(latestIncome.incomeBeforeTax);
        const interestExpense = this.parseFloat(latestIncome.interestExpense) || 0;
        ebit = incomeBeforeTax + interestExpense;
      }
      
      // Calculate effective tax rate
      const incomeBeforeTax = this.parseFloat(latestIncome.incomeBeforeTax);
      const incomeTaxExpense = this.parseFloat(latestIncome.incomeTaxExpense);
      const taxRate = incomeBeforeTax > 0 && incomeTaxExpense > 0 
        ? incomeTaxExpense / incomeBeforeTax 
        : 0.21; // Default corporate tax rate
      
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
   * Uses interest-bearing debt only for accuracy
   * Good benchmark: < 1.0 (varies by industry)
   */
  calculateDebtToEquity(balance: BalanceSheet): string {
    try {
      const latest = balance?.annualReports?.[0];
      if (!latest) return '0.00';
      
      // Calculate total interest-bearing debt
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
   * Get interpretation for Debt/Equity ratio
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

  /**
   * Calculate all metrics at once for a comprehensive analysis
   */
  calculateAllMetrics(
    overview: CompanyOverview,
    income: IncomeStatement,
    balance: BalanceSheet,
    cashFlow: CashFlow
  ) {
    return {
      altmanZScore: this.calculateAltmanZScore(overview, income, balance),
      piotroskiScore: this.calculatePiotroskiScore(income, balance, cashFlow),
      freeCashFlow: this.calculateFreeCashFlow(cashFlow),
      fcfYield: this.calculateFCFYield(overview, cashFlow),
      roic: this.calculateROIC(income, balance),
      currentRatio: this.calculateCurrentRatio(balance),
      quickRatio: this.calculateQuickRatio(balance),
      debtToEquity: this.calculateDebtToEquity(balance)
    };
  }
}

// Export singleton instance
const metricsCalculator = new MetricsCalculator();
export default metricsCalculator;
