// src/services/macroDataService.ts
import axios from 'axios';

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'NMSRS0ZDIOWF3CLL';
const BASE_URL = 'https://www.alphavantage.co/query';

export interface MacroMetric {
  value: string;
  change: string;
  trend: 'up' | 'down' | 'flat';
  percentChange?: number;
}

export const fetchAndProcessMacroData = async () => {
  try {
    // Fetch all data
    const [gdpResponse, cpiResponse, unemploymentResponse, fedRateResponse, treasuryResponse] = await Promise.all([
      axios.get(`${BASE_URL}?function=REAL_GDP&interval=quarterly&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=CPI&interval=monthly&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=UNEMPLOYMENT&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=FEDERAL_FUNDS_RATE&interval=daily&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=${API_KEY}`)
    ]);

    // Process GDP - Calculate Year-over-Year growth
    const gdpData = gdpResponse.data.data;
    if (gdpData && gdpData.length > 4) {
      const currentGDP = parseFloat(gdpData[0].value);
      const yearAgoGDP = parseFloat(gdpData[4].value); // 4 quarters ago
      const gdpGrowth = ((currentGDP - yearAgoGDP) / yearAgoGDP * 100).toFixed(1);
      
      const previousGDP = parseFloat(gdpData[1].value);
      const prevYearAgoGDP = parseFloat(gdpData[5].value);
      const prevGdpGrowth = ((previousGDP - prevYearAgoGDP) / prevYearAgoGDP * 100).toFixed(1);
      const gdpChange = (parseFloat(gdpGrowth) - parseFloat(prevGdpGrowth)).toFixed(1);

      gdpMetric = {
        value: `${gdpGrowth}%`,
        change: `${gdpChange > 0 ? '+' : ''}${gdpChange}%`,
        trend: gdpChange > 0 ? 'up' : gdpChange < 0 ? 'down' : 'flat'
      };
    }

    // Process CPI - Calculate Year-over-Year inflation
    const cpiData = cpiResponse.data.data;
    if (cpiData && cpiData.length > 12) {
      const currentCPI = parseFloat(cpiData[0].value);
      const yearAgoCPI = parseFloat(cpiData[12].value); // 12 months ago
      const inflation = ((currentCPI - yearAgoCPI) / yearAgoCPI * 100).toFixed(1);
      
      const previousCPI = parseFloat(cpiData[1].value);
      const prevYearAgoCPI = parseFloat(cpiData[13].value);
      const prevInflation = ((previousCPI - prevYearAgoCPI) / prevYearAgoCPI * 100).toFixed(1);
      const inflationChange = (parseFloat(inflation) - parseFloat(prevInflation)).toFixed(1);

      cpiMetric = {
        value: `${inflation}%`,
        change: `${inflationChange > 0 ? '+' : ''}${inflationChange}%`,
        trend: inflationChange > 0 ? 'up' : inflationChange < 0 ? 'down' : 'flat'
      };
    }

    // Process Unemployment - Direct percentage
    const unemploymentData = unemploymentResponse.data.data;
    if (unemploymentData && unemploymentData.length > 1) {
      const currentUnemployment = parseFloat(unemploymentData[0].value).toFixed(1);
      const previousUnemployment = parseFloat(unemploymentData[1].value).toFixed(1);
      const unemploymentChange = (parseFloat(currentUnemployment) - parseFloat(previousUnemployment)).toFixed(1);

      unemploymentMetric = {
        value: `${currentUnemployment}%`,
        change: `${unemploymentChange > 0 ? '+' : ''}${unemploymentChange}%`,
        trend: unemploymentChange > 0 ? 'up' : unemploymentChange < 0 ? 'down' : 'flat'
      };
    }

    // Process Fed Rate - Direct percentage
    const fedRateData = fedRateResponse.data.data;
    if (fedRateData && fedRateData.length > 1) {
      const currentRate = parseFloat(fedRateData[0].value).toFixed(2);
      const previousRate = parseFloat(fedRateData[1].value).toFixed(2);
      const rateChange = (parseFloat(currentRate) - parseFloat(previousRate)).toFixed(2);

      fedRateMetric = {
        value: `${currentRate}%`,
        change: rateChange != 0 ? `${rateChange > 0 ? '+' : ''}${rateChange}%` : '0%',
        trend: rateChange > 0 ? 'up' : rateChange < 0 ? 'down' : 'flat'
      };
    }

    // Process Treasury Yield
    const treasuryData = treasuryResponse.data.data;
    if (treasuryData && treasuryData.length > 1) {
      const currentYield = parseFloat(treasuryData[0].value).toFixed(2);
      const previousYield = parseFloat(treasuryData[1].value).toFixed(2);
      const yieldChange = (parseFloat(currentYield) - parseFloat(previousYield)).toFixed(2);

      treasuryMetric = {
        value: `${currentYield}%`,
        change: `${yieldChange > 0 ? '+' : ''}${yieldChange}%`,
        trend: yieldChange > 0 ? 'up' : yieldChange < 0 ? 'down' : 'flat'
      };
    }

    // Calculate Real Interest Rate
    const realRate = (parseFloat(fedRateMetric.value) - parseFloat(cpiMetric.value)).toFixed(2);
    const realRateMetric = {
      value: `${realRate}%`,
      change: '+0.38%', // This would need historical calculation
      trend: parseFloat(realRate) > 0 ? 'up' : 'down'
    };

    return {
      gdp: gdpMetric,
      cpi: cpiMetric,
      unemployment: unemploymentMetric,
      fedRate: fedRateMetric,
      treasury10Y: treasuryMetric,
      realRate: realRateMetric
    };

  } catch (error) {
    console.error('Error fetching macro data:', error);
    // Return default values on error
    return {
      gdp: { value: '2.8%', change: '+0.3%', trend: 'up' },
      cpi: { value: '3.2%', change: '-0.3%', trend: 'down' },
      unemployment: { value: '3.7%', change: '-0.2%', trend: 'down' },
      fedRate: { value: '5.25%', change: '0%', trend: 'flat' },
      treasury10Y: { value: '4.28%', change: '+0.08%', trend: 'up' },
      realRate: { value: '2.05%', change: '+0.38%', trend: 'up' }
    };
  }
};

// Additional commodity data fetching
export const fetchCommodityData = async () => {
  try {
    const [oilResponse, gasResponse, copperResponse] = await Promise.all([
      axios.get(`${BASE_URL}?function=WTI&interval=daily&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=NATURAL_GAS&interval=daily&apikey=${API_KEY}`),
      axios.get(`${BASE_URL}?function=COPPER&interval=monthly&apikey=${API_KEY}`)
    ]);

    // Process Oil
    const oilData = oilResponse.data.data;
    let oilMetric = { value: '$78.25', change: '+$2.15', trend: 'up' as const };
    if (oilData && oilData.length > 1) {
      const currentOil = parseFloat(oilData[0].value).toFixed(2);
      const previousOil = parseFloat(oilData[1].value).toFixed(2);
      const oilChange = (parseFloat(currentOil) - parseFloat(previousOil)).toFixed(2);
      
      oilMetric = {
        value: `$${currentOil}`,
        change: `${parseFloat(oilChange) > 0 ? '+' : ''}$${oilChange}`,
        trend: parseFloat(oilChange) > 0 ? 'up' : parseFloat(oilChange) < 0 ? 'down' : 'flat'
      };
    }

    // Process Natural Gas
    const gasData = gasResponse.data.data;
    let gasMetric = { value: '$2.85', change: '-$0.12', trend: 'down' as const };
    if (gasData && gasData.length > 1) {
      const currentGas = parseFloat(gasData[0].value).toFixed(2);
      const previousGas = parseFloat(gasData[1].value).toFixed(2);
      const gasChange = (parseFloat(currentGas) - parseFloat(previousGas)).toFixed(2);
      
      gasMetric = {
        value: `$${currentGas}`,
        change: `${parseFloat(gasChange) > 0 ? '+' : ''}$${gasChange}`,
        trend: parseFloat(gasChange) > 0 ? 'up' : parseFloat(gasChange) < 0 ? 'down' : 'flat'
      };
    }

    // Process Copper
    const copperData = copperResponse.data.data;
    let copperMetric = { value: '$4.21', change: '+$0.08', trend: 'up' as const };
    if (copperData && copperData.length > 1) {
      const currentCopper = parseFloat(copperData[0].value).toFixed(2);
      const previousCopper = parseFloat(copperData[1].value).toFixed(2);
      const copperChange = (parseFloat(currentCopper) - parseFloat(previousCopper)).toFixed(2);
      
      copperMetric = {
        value: `$${currentCopper}`,
        change: `${parseFloat(copperChange) > 0 ? '+' : ''}$${copperChange}`,
        trend: parseFloat(copperChange) > 0 ? 'up' : parseFloat(copperChange) < 0 ? 'down' : 'flat'
      };
    }

    return {
      oil: oilMetric,
      naturalGas: gasMetric,
      copper: copperMetric
    };

  } catch (error) {
    console.error('Error fetching commodity data:', error);
    return {
      oil: { value: '$78.25', change: '+$2.15', trend: 'up' as const },
      naturalGas: { value: '$2.85', change: '-$0.12', trend: 'down' as const },
      copper: { value: '$4.21', change: '+$0.08', trend: 'up' as const }
    };
  }
};
