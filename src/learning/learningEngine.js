/**
 * CRAB LEARNING ENGINE v1.0
 * ─────────────────────────────────────────────────────────────
 * Adaptive intelligence layer. Analyses memory to:
 *   1. Select highest-scoring modes (Thompson sampling)
 *   2. Evolve the crab's personality based on market state
 *   3. Detect market regime and adjust posting strategy
 * ─────────────────────────────────────────────────────────────
 */

import { log } from "../logger.js";
import { getMarketTrend } from "../memory/memoryStore.js";

// ─── Market Regime Detection ──────────────────

/**
 * Classifies current market state into a regime.
 * Drives personality and mode bias.
 */
export function detectMarketRegime(memory, currentStats) {
  const trend = getMarketTrend(memory);
  const holderDelta = memory.holderSummary?.lastDelta ?? 0;
  const growthRate = memory.holderSummary?.growthRate ?? 0;
  const peakHolders = memory.holderSummary?.peakHolders ?? 0;
  const currentHolders = parseInt(currentStats.holders) || 0;

  // Compute distance from ATH holders
  const athRatio = peakHolders > 0 ? currentHolders / peakHolders : 1;

  let regime, description, postingStrategy;

  if (trend === "pumping" && holderDelta > 30) {
    regime = "MOON";
    description = "Token pumping hard. Holders surging. MAX HYPE.";
    postingStrategy = { hype: 0.6, alpha: 0.25, roast: 0.1, crabwalk: 0.05, lore: 0 };
  } else if (trend === "growing" && growthRate > 5) {
    regime = "ACCUMULATION";
    description = "Steady holder growth. Quiet accumulation phase.";
    postingStrategy = { lore: 0.35, alpha: 0.3, crabwalk: 0.2, hype: 0.15, roast: 0 };
  } else if (trend === "stable" && athRatio > 0.8) {
    regime = "CONSOLIDATION";
    description = "Holding strong near ATH. Consolidation.";
    postingStrategy = { crabwalk: 0.35, hype: 0.25, lore: 0.2, alpha: 0.2, roast: 0 };
  } else if (trend === "cooling" || athRatio < 0.6) {
    regime = "COOLDOWN";
    description = "Volume cooling. Need narrative and lore to hold attention.";
    postingStrategy = { lore: 0.4, roast: 0.3, crabwalk: 0.2, hype: 0.1, alpha: 0 };
  } else if (trend === "dumping") {
    regime = "COPE";
    description = "Bleeding. Time for aggressive roasts and crab lore cope.";
    postingStrategy = { roast: 0.5, lore: 0.3, crabwalk: 0.2, hype: 0, alpha: 0 };
  } else {
    regime = "UNKNOWN";
    description = "Insufficient data. Operating on vibes.";
    postingStrategy = { hype: 0.2, roast: 0.2, lore: 0.2, alpha: 0.2, crabwalk: 0.2 };
  }

  log.info(`market regime: ${regime} — ${description}`);
  return { regime, description, postingStrategy, trend, holderDelta, athRatio };
}

// ─── Mode Selection (Thompson Sampling) ───────

/**
 * Thompson sampling: treat each mode's score as a Beta distribution.
 * Sample from each and pick the highest — balances explore vs exploit.
 *
 * High-scoring modes get picked more, but low-scoring ones still
 * get occasional chances to prove themselves.
 */
export function thompsonSelectMode(memory, regimeWeights) {
  const modeStats = memory.modeStats;
  const modes = Object.keys(modeStats);

  const samples = modes.map((mode) => {
    const { score, runs } = modeStats[mode];
    const regimeBias = regimeWeights[mode] ?? 0.2;

    // Beta distribution approximation using score as mean
    const alpha = score * 10 + 1;
    const beta = (1 - score) * 10 + 1;
    const sample = betaSample(alpha, beta);

    // Blend Thompson sample with regime bias
    const blended = sample * 0.6 + regimeBias * 0.4;

    log.info(
      `  mode=${mode.padEnd(9)} score=${score.toFixed(3)}  ` +
      `regime_bias=${regimeBias.toFixed(2)}  sample=${blended.toFixed(3)}  runs=${runs}`
    );

    return { mode, value: blended };
  });

  // Pick highest sample
  const selected = samples.reduce((best, s) => s.value > best.value ? s : best);
  log.info(`thompson selected: ${selected.mode.toUpperCase()} (value=${selected.value.toFixed(3)})`);
  return selected.mode;
}

// ─── Personality Evolution ────────────────────

/**
 * Evolves the crab's personality based on:
 * - Market regime
 * - Post history patterns
 * - Holder growth trajectory
 */
export function evolvePersonality(memory, regime) {
  const p = memory.personality;
  const totalPosts = memory.posts.length;

  // Every 10 posts, consider a trait mutation
  if (totalPosts > 0 && totalPosts % 10 === 0) {
    log.info(`personality evolution cycle ${p.evolution + 1}`);

    // Aggression follows market
    if (regime.regime === "MOON") p.aggression = Math.min(1, p.aggression + 0.08);
    if (regime.regime === "COPE") p.aggression = Math.max(0.3, p.aggression - 0.05);

    // Lore depth increases over time — the crab grows wiser
    p.loreDepth = Math.min(1, p.loreDepth + 0.02);

    // Roast frequency spikes during dumps
    if (regime.regime === "COPE" || regime.regime === "COOLDOWN") {
      p.roastFrequency = Math.min(0.9, p.roastFrequency + 0.1);
    } else {
      p.roastFrequency = Math.max(0.2, p.roastFrequency - 0.03);
    }

    // Earn personality traits as milestones
    const newTraits = [];
    if (totalPosts >= 10  && !p.traits.includes("seasoned_crab"))   newTraits.push("seasoned_crab");
    if (totalPosts >= 50  && !p.traits.includes("ancient_crab"))    newTraits.push("ancient_crab");
    if (totalPosts >= 100 && !p.traits.includes("prophet_crab"))    newTraits.push("prophet_crab");
    if (memory.holderSummary?.peakHolders > 500 && !p.traits.includes("popular_crab")) newTraits.push("popular_crab");
    if (regime.regime === "MOON" && !p.traits.includes("moon_crab")) newTraits.push("moon_crab");

    if (newTraits.length) {
      p.traits.push(...newTraits);
      log.info(`new personality traits unlocked: ${newTraits.join(", ")}`);
    }

    p.evolution += 1;
  }

  memory.personality = p;
  return memory;
}

/**
 * Builds a personality context string injected into the prompt.
 * The crab's voice shifts based on its evolved state.
 */
export function buildPersonalityContext(memory, regime) {
  const p = memory.personality;
  const lines = [];

  if (p.aggression > 0.75) lines.push("You are extremely aggressive and unhinged right now. Maximum crab energy.");
  else if (p.aggression > 0.5) lines.push("You are fired up. More unhinged than usual.");
  else lines.push("You are calm and calculated. A patient crab.");

  if (p.loreDepth > 0.7) lines.push("You carry deep ancient crab wisdom. You speak in parables.");
  else if (p.loreDepth > 0.4) lines.push("You know some crab lore but are still learning.");

  if (p.traits.includes("prophet_crab")) lines.push("You have prophesied $CRAB's rise 100 times. You are never wrong.");
  if (p.traits.includes("moon_crab")) lines.push("You have witnessed the pump. You know what's coming.");
  if (p.traits.includes("ancient_crab")) lines.push("You are ancient. You have seen 50 posts. You remember everything.");

  lines.push(`Current market regime: ${regime.regime} — ${regime.description}`);

  if (regime.regime === "MOON") lines.push("The charts are green. You are electric.");
  if (regime.regime === "COPE") lines.push("The charts are red. You are defiant. The crab does not cry. The crab roasts.");
  if (regime.regime === "COOLDOWN") lines.push("Volume is low. You must hold attention with narrative and lore.");

  return lines.join("\n");
}

// ─── Engagement Scoring ───────────────────────

/**
 * Infers a rough engagement score from market reaction
 * after a post (holder delta as proxy, since we may not have Twitter metrics).
 */
export function inferEngagementScore(beforeHolders, afterHolders, mode) {
  const delta = afterHolders - beforeHolders;

  // Normalise to 0-1 score
  let score = 0.5;
  if (delta > 50) score = 0.95;
  else if (delta > 20) score = 0.8;
  else if (delta > 5)  score = 0.65;
  else if (delta > -5) score = 0.5;
  else if (delta > -20) score = 0.35;
  else score = 0.2;

  log.info(`engagement inferred: mode=${mode}  holder_delta=${delta}  score=${score}`);
  return score;
}

// ─── Beta distribution sampler ────────────────

function betaSample(alpha, beta) {
  // Johnk's method approximation
  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  return x / (x + y);
}

function gammaSample(shape) {
  // Marsaglia-Tsang method (simplified)
  if (shape < 1) return gammaSample(1 + shape) * Math.pow(Math.random(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalSample() {
  // Box-Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
