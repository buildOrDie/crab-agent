/**
 * CRAB MEMORY STORE
 * ─────────────────────────────────────────────
 * Persistent JSON-backed memory across sessions.
 * Tracks posts, market conditions, holder growth.
 * ─────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "../logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

const DEFAULT_MEMORY = {
  version: 1,
  created: new Date().toISOString(),
  lastUpdated: null,

  // Post history
  posts: [],               // { id, text, mode, timestamp, stats, engagement }
  recentHashes: [],        // last 50 post fingerprints to prevent repeats

  // Market history
  marketHistory: [],       // { timestamp, price, marketCap, volume, holders }
  marketSummary: {
    avgVolume: 0,
    avgHolders: 0,
    peakMarketCap: 0,
    lowestPrice: null,
    highestPrice: null,
    totalSnapshots: 0,
  },

  // Holder growth
  holderHistory: [],       // { timestamp, holders, delta, trend }
  holderSummary: {
    peakHolders: 0,
    growthRate: 0,         // holders per hour avg
    lastDelta: 0,
  },

  // Agent state
  personality: {
    aggression: 0.5,       // 0=calm, 1=unhinged
    loreDepth: 0.5,        // 0=surface, 1=deep lore
    roastFrequency: 0.5,   // how often to roast others
    evolution: 0,          // total evolution cycles
    traits: [],            // earned personality traits
  },

  // Mode performance
  modeStats: {
    hype:     { runs: 0, score: 0.5, lastUsed: null },
    roast:    { runs: 0, score: 0.5, lastUsed: null },
    lore:     { runs: 0, score: 0.5, lastUsed: null },
    alpha:    { runs: 0, score: 0.5, lastUsed: null },
    crabwalk: { runs: 0, score: 0.5, lastUsed: null },
  },
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadMemory() {
  ensureDataDir();
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
      const mem = JSON.parse(raw);
      log.info(`memory loaded — ${mem.posts.length} posts  ${mem.marketHistory.length} snapshots`);
      return mem;
    }
  } catch (err) {
    log.warn(`memory file corrupt, resetting: ${err.message}`);
  }
  log.info("initialising fresh memory store");
  return structuredClone(DEFAULT_MEMORY);
}

export function saveMemory(memory) {
  ensureDataDir();
  memory.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// ─── Post Memory ─────────────────────────────

export function recordPost(memory, { text, mode, stats }) {
  const hash = simpleHash(text);

  // Prevent near-duplicate posts
  if (memory.recentHashes.includes(hash)) {
    log.warn("duplicate post detected — skipping record");
    return memory;
  }

  const post = {
    id: `post_${Date.now()}`,
    text,
    mode,
    timestamp: new Date().toISOString(),
    stats: {
      price: stats.price,
      marketCap: stats.marketCap,
      volume: stats.volume,
      holders: stats.holders,
    },
    engagement: null, // updated later if Twitter feedback available
  };

  memory.posts.push(post);
  memory.recentHashes.push(hash);

  // Keep last 50 hashes only
  if (memory.recentHashes.length > 50) {
    memory.recentHashes = memory.recentHashes.slice(-50);
  }

  // Keep last 500 posts
  if (memory.posts.length > 500) {
    memory.posts = memory.posts.slice(-500);
  }

  return memory;
}

export function getRecentPosts(memory, n = 5) {
  return memory.posts.slice(-n).map((p) => p.text);
}

export function isNearDuplicate(memory, text) {
  const hash = simpleHash(text);
  return memory.recentHashes.includes(hash);
}

// ─── Market History ───────────────────────────

export function recordMarketSnapshot(memory, stats) {
  const snapshot = {
    timestamp: new Date().toISOString(),
    price: parseFloat(stats.price),
    marketCap: stats.marketCap,
    volume: stats.volume,
    holders: parseInt(stats.holders),
  };

  memory.marketHistory.push(snapshot);

  // Keep last 720 snapshots (30 days at 1/hr)
  if (memory.marketHistory.length > 720) {
    memory.marketHistory = memory.marketHistory.slice(-720);
  }

  // Update summary
  const prices = memory.marketHistory.map((s) => s.price).filter(Boolean);
  const holders = memory.marketHistory.map((s) => s.holders).filter(Boolean);

  memory.marketSummary = {
    avgVolume: average(memory.marketHistory.map((s) => parseFloat(s.volume) || 0)),
    avgHolders: average(holders),
    peakMarketCap: memory.marketHistory.reduce((max, s) => {
      const v = parseFloat(s.marketCap) || 0;
      return v > max ? v : max;
    }, memory.marketSummary.peakMarketCap || 0),
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    totalSnapshots: memory.marketHistory.length,
  };

  return memory;
}

export function getMarketTrend(memory, windowSize = 6) {
  const recent = memory.marketHistory.slice(-windowSize);
  if (recent.length < 2) return "unknown";

  const first = recent[0].holders || 0;
  const last = recent[recent.length - 1].holders || 0;
  const delta = last - first;

  if (delta > 50) return "pumping";
  if (delta > 10) return "growing";
  if (delta > -10) return "stable";
  if (delta > -50) return "cooling";
  return "dumping";
}

// ─── Holder Growth ────────────────────────────

export function recordHolderSnapshot(memory, holders) {
  const prev = memory.holderHistory.slice(-1)[0];
  const delta = prev ? holders - prev.holders : 0;

  const trend =
    delta > 20 ? "surging" :
    delta > 5  ? "growing" :
    delta > -5 ? "stable" :
    delta > -20 ? "declining" : "bleeding";

  memory.holderHistory.push({
    timestamp: new Date().toISOString(),
    holders,
    delta,
    trend,
  });

  // Keep last 720
  if (memory.holderHistory.length > 720) {
    memory.holderHistory = memory.holderHistory.slice(-720);
  }

  // Update summary
  const allHolders = memory.holderHistory.map((h) => h.holders);
  const recentDeltas = memory.holderHistory.slice(-24).map((h) => h.delta);

  memory.holderSummary = {
    peakHolders: Math.max(...allHolders, memory.holderSummary.peakHolders || 0),
    growthRate: average(recentDeltas),
    lastDelta: delta,
  };

  return memory;
}

// ─── Mode Stats ────────────────────────────────

export function recordModeRun(memory, mode) {
  if (!memory.modeStats[mode]) return memory;
  memory.modeStats[mode].runs += 1;
  memory.modeStats[mode].lastUsed = new Date().toISOString();
  return memory;
}

export function updateModeScore(memory, mode, score) {
  if (!memory.modeStats[mode]) return memory;
  const current = memory.modeStats[mode].score;
  // Exponential moving average — new data weighted 30%
  memory.modeStats[mode].score = current * 0.7 + score * 0.3;
  return memory;
}

// ─── Helpers ─────────────────────────────────

function simpleHash(str) {
  // Rough fingerprint — first 80 chars, lowercased
  return str.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
