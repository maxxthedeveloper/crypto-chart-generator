export interface Token {
  id: string;
  symbol: string;
  name: string;
}

export interface PriceData {
  prices: [number, number][];
}

const BASE_URL = 'https://api.coingecko.com/api/v3';

export async function searchTokens(query: string): Promise<Token[]> {
  if (!query || query.length < 1) return [];

  const res = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');

  const data = await res.json();
  return data.coins.slice(0, 10).map((coin: any) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
  }));
}

export async function getMarketChart(
  tokenId: string,
  timeframe: '1H' | '24H' | '7D' | '30D'
): Promise<[number, number][]> {
  const daysMap = {
    '1H': '1',
    '24H': '1',
    '7D': '7',
    '30D': '30',
  };

  const days = daysMap[timeframe];
  const res = await fetch(
    `${BASE_URL}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`
  );

  if (!res.ok) throw new Error('Failed to fetch chart data');

  const data: PriceData = await res.json();
  let prices = data.prices;

  // For 1H, slice to get approximately the last hour of data
  if (timeframe === '1H') {
    const pointsPerHour = Math.ceil(prices.length / 24);
    prices = prices.slice(-pointsPerHour);
  }

  return prices;
}
