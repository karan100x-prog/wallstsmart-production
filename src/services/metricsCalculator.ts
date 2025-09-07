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
