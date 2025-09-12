const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'NMSRS0ZDIOWF3CLL';

export const fetchEconomicData = async () => {
  const endpoints = {
    gdp: `https://www.alphavantage.co/query?function=REAL_GDP&interval=quarterly&apikey=${API_KEY}`,
    cpi: `https://www.alphavantage.co/query?function=CPI&interval=monthly&apikey=${API_KEY}`,
    unemployment: `https://www.alphavantage.co/query?function=UNEMPLOYMENT&apikey=${API_KEY}`,
    treasury: `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=${API_KEY}`,
    fedRate: `https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&interval=daily&apikey=${API_KEY}`
  };
  
  // Fetch all data in parallel
  const [gdp, cpi, unemployment, treasury, fedRate] = await Promise.all([
    fetch(endpoints.gdp).then(r => r.json()),
    fetch(endpoints.cpi).then(r => r.json()),
    fetch(endpoints.unemployment).then(r => r.json()),
    fetch(endpoints.treasury).then(r => r.json()),
    fetch(endpoints.fedRate).then(r => r.json())
  ]);
  
  return { gdp, cpi, unemployment, treasury, fedRate };
};
