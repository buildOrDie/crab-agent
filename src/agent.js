/**
 * $CRAB AI AGENT — ADVANCED
 * Pipeline:
 *   Memory → Snapshot → Regime → Personality → Mode → Generate → Post → Save
 */

import Anthropic from "@anthropic-ai/sdk";
import { postTweet } from "./twitter.js";
import { getTokenStats } from "./pumpfun.js";
import { loadPrompt } from "./prompts.js";
import { quantumSelectMode } from "./quantum/quantumEngine.js";
import { log } from "./logger.js";
import {
  loadMemory, saveMemory, recordPost, recordMarketSnapshot,
  recordHolderSnapshot, recordModeRun, updateModeScore,
  getRecentPosts, isNearDuplicate,
} from "./memory/memoryStore.js";
import {
  detectMarketRegime, thompsonSelectMode, evolvePersonality,
  buildPersonalityContext, inferEngagementScore,
} from "./learning/learningEngine.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runAgent() {
  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log.info("CRAB AGENT CYCLE START");

  let memory = loadMemory();
  const stats = await getTokenStats();
  log.info(`mcap=$${stats.marketCap}  holders=${stats.holders}  vol=$${stats.volume}`);

  memory = recordMarketSnapshot(memory, stats);
  memory = recordHolderSnapshot(memory, parseInt(stats.holders) || 0);

  const regime = detectMarketRegime(memory, stats);
  memory = evolvePersonality(memory, regime);
  const personalityCtx = buildPersonalityContext(memory, regime);

  log.info(`personality: aggression=${memory.personality.aggression.toFixed(2)}  lore=${memory.personality.loreDepth.toFixed(2)}  traits=[${memory.personality.traits.join(",")}]`);
  log.info("selecting mode via Thompson sampling...");

  const thompsonMode = thompsonSelectMode(memory, regime.postingStrategy);

  log.quantum("cross-validating with quantum circuit...");
  const quantum = await quantumSelectMode(stats);

  const finalMode = Math.random() < 0.6 ? thompsonMode : quantum.mode;
  log.info(`final mode: ${finalMode.toUpperCase()}  (thompson=${thompsonMode}  quantum=${quantum.mode})`);

  const recentPosts = getRecentPosts(memory, 5);
  const systemPrompt = buildSystemPrompt(loadPrompt("crab_system"), personalityCtx);
  const userPrompt = buildUserPrompt(finalMode, stats, quantum, recentPosts, regime, memory);

  let tweet = null;
  let attempts = 0;
  while (!tweet && attempts < 3) {
    attempts++;
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const candidate = response.content[0].text.trim();
    if (isNearDuplicate(memory, candidate)) {
      log.warn(`attempt ${attempts}: near-duplicate, regenerating...`);
    } else {
      tweet = candidate;
    }
  }

  if (!tweet) tweet = "🦀 the crab is thinking. sideways.";

  log.info(`\n┌─ GENERATED ${"─".repeat(44)}\n│\n│  ${tweet.replace(/\n/g, "\n│  ")}\n│\n└${"─".repeat(50)}\n`);

  if (process.env.POST_ENABLED === "true") {
    await postTweet(tweet);
    log.info("posted to Twitter/X");
  } else {
    log.warn("dry run — set POST_ENABLED=true to post live");
  }

  memory = recordPost(memory, { text: tweet, mode: finalMode, stats });
  memory = recordModeRun(memory, finalMode);

  const prevHolders = memory.holderHistory.slice(-2)[0]?.holders ?? parseInt(stats.holders);
  const engagementScore = inferEngagementScore(prevHolders, parseInt(stats.holders), finalMode);
  memory = updateModeScore(memory, finalMode, engagementScore);

  saveMemory(memory);
  log.info(`memory saved — posts: ${memory.posts.length}  evolution: ${memory.personality.evolution}`);
  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  return tweet;
}

function buildSystemPrompt(basePrompt, personalityCtx) {
  return `${basePrompt}\n\n## CURRENT PERSONALITY STATE\n${personalityCtx}`;
}

function buildUserPrompt(mode, stats, quantum, recentPosts, regime, memory) {
  const recentBlock = recentPosts.length
    ? `\nRECENT POSTS (do NOT repeat these):\n${recentPosts.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`
    : "";

  const statsBlock =
    `Token: $CRAB on pump.fun\nPrice: ${stats.price} SOL\n` +
    `Market Cap: $${stats.marketCap}\nVolume 24h: $${stats.volume}\n` +
    `Holders: ${stats.holders}  (peak: ${memory.holderSummary?.peakHolders ?? "?"}  growth: ${memory.holderSummary?.growthRate?.toFixed(1) ?? "?"}\/hr)\n` +
    `Market regime: ${regime.regime}\nQuantum eigenstate: ${quantum.eigenstate}  confidence: ${(quantum.confidence * 100).toFixed(1)}%\n` +
    `Agent lifetime posts: ${memory.posts.length}\nPersonality traits: ${memory.personality.traits.join(", ") || "none yet"}`;

  const modeInstructions = {
    hype:     `Generate maximum hype. The crab is coming. Everyone will be crabs. ${regime.regime === "MOON" ? "We are mooning. Be electric." : ""}`,
    roast:    `Destroy other meme coins with crab logic. ${regime.regime === "COPE" ? "We are down but NEVER out. Channel pain into roasts." : ""}`,
    lore:     `Drop deep $CRAB lore. Ancient crab wisdom. ${memory.personality.loreDepth > 0.7 ? "You are an ancient prophet crab. Speak in riddles." : ""}`,
    alpha:    `Give fake insider alpha. You are a whale who has been accumulating. You know something others don't.`,
    crabwalk: `The crab walks sideways. Use this as a metaphor for $CRAB's unconventional path to dominance. ${regime.regime === "CONSOLIDATION" ? "Sideways IS the move." : ""}`,
  };

  return `${statsBlock}\n${recentBlock}\nMode: ${modeInstructions[mode]}\n\nWrite ONE tweet (max 280 chars). No hashtag spam. Be unhinged but not cringe. Never start with "I" or "The crab". Pure crab brain.`;
}

async function loop() {
  while (true) {
    try {
      await runAgent();
    } catch (err) {
      log.error(`agent crashed: ${err.message}`);
      console.error(err);
    }
    const delay = parseInt(process.env.POST_INTERVAL_MS || "3600000");
    log.info(`next cycle in ${delay / 60000} minutes`);
    await new Promise((r) => setTimeout(r, delay));
  }
}

loop();
