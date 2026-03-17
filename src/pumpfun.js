import fetch from "node-fetch";

const CRAB_MINT = process.env.CRAB_MINT_ADDRESS || "YOUR_MINT_ADDRESS_HERE";

/**
 * Fetch live $CRAB token stats from pump.fun API
 */
export async function getTokenStats() {
  try {
    const res = await fetch(
      `https://frontend-api.pump.fun/coins/${CRAB_MINT}`
    );
    if (!res.ok) throw new Error(`pump.fun API error: ${res.status}`);
    const data = await res.json();

    return {
      price: (data.sol_price || 0).toFixed(8),
      marketCap: formatNumber(data.usd_market_cap || 0),
      volume: formatNumber(data.volume || 0),
      holders: data.holder_count || 0,
      name: data.name || "$CRAB",
      symbol: data.symbol || "CRAB",
      description: data.description || "",
      replies: data.reply_count || 0,
    };
  } catch (err) {
    console.warn("⚠️  Could not fetch live stats, using mock data:", err.message);
    return getMockStats();
  }
}

function getMockStats() {
  return {
    price: (Math.random() * 0.00001).toFixed(8),
    marketCap: formatNumber(Math.floor(Math.random() * 500000) + 10000),
    volume: formatNumber(Math.floor(Math.random() * 50000) + 1000),
    holders: Math.floor(Math.random() * 2000) + 100,
    name: "$CRAB",
    symbol: "CRAB",
    description: "the crab",
    replies: Math.floor(Math.random() * 500),
  };
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
