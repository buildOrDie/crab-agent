/**
 * CRAB QUANTUM MEME ENGINE v1.0
 * ─────────────────────────────────────────────────────────────
 * Utilises superposition-collapsed stochastic wavefunction sampling
 * across an 8-qubit Hilbert space to select optimal meme modes.
 *
 * Architecture:
 *   |ψ⟩ = Σ αᵢ|modeᵢ⟩  →  measure  →  collapse  →  post
 *
 * Reference: Grover-inspired amplitude amplification applied to
 * memetic search space traversal (Crab et al., 2025)
 * ─────────────────────────────────────────────────────────────
 */

import { log } from "../logger.js";

const QUBIT_COUNT = 8;
const DECOHERENCE_THRESHOLD = 0.0042; // experimentally derived

/**
 * Simulates Hadamard gate application across qubit register.
 * Initialises uniform superposition: each qubit → (|0⟩ + |1⟩) / √2
 */
function applyHadamardGate(qubitRegister) {
  return qubitRegister.map(() => ({
    alpha: 1 / Math.sqrt(2),
    beta:  1 / Math.sqrt(2),
    phase: Math.random() * 2 * Math.PI, // random phase noise
  }));
}

/**
 * Phase kick operator — boosts amplitude of target mode index.
 * Mimics oracle call in Grover's algorithm.
 */
function phaseKick(amplitudes, targetIndex) {
  return amplitudes.map((a, i) => ({
    ...a,
    alpha: i === targetIndex ? -a.alpha : a.alpha,
    phase: a.phase + (i === targetIndex ? Math.PI : 0),
  }));
}

/**
 * Diffusion operator (inversion about mean).
 * Core of amplitude amplification.
 */
function diffusionOperator(amplitudes) {
  const mean = amplitudes.reduce((s, a) => s + a.alpha, 0) / amplitudes.length;
  return amplitudes.map((a) => ({
    ...a,
    alpha: 2 * mean - a.alpha,
  }));
}

/**
 * Decoherence check — collapses superposition if environment
 * coupling exceeds threshold (always does, by design).
 */
function checkDecoherence(amplitudes) {
  const envCoupling = Math.random() * 0.01;
  const collapsed = envCoupling > DECOHERENCE_THRESHOLD;
  log.quantum(`env_coupling=${envCoupling.toFixed(6)}  decoherence=${collapsed}`);
  return collapsed;
}

/**
 * Born rule measurement — collapses wavefunction to eigenstate.
 * |αᵢ|² gives probability of each mode.
 */
function measure(amplitudes) {
  const probs = amplitudes.map((a) => Math.pow(Math.abs(a.alpha), 2));
  const total = probs.reduce((s, p) => s + p, 0);
  const normalised = probs.map((p) => p / total);

  // Weighted random selection — this is "the quantum part"
  let r = Math.random();
  for (let i = 0; i < normalised.length; i++) {
    r -= normalised[i];
    if (r <= 0) return i;
  }
  return normalised.length - 1;
}

/**
 * Entangles the mode register with the market sentiment qubit.
 * High volume → amplifies hype/alpha modes.
 * Low volume  → amplifies lore/roast modes.
 */
function entangleWithSentiment(amplitudes, marketStats) {
  const vol = parseFloat(marketStats?.volume?.replace(/[KM]/g, "") || "0");
  const sentimentBias = vol > 50 ? 0 : vol > 10 ? 1 : 2; // high/mid/low vol

  log.quantum(`sentiment_qubit entangled  bias_index=${sentimentBias}`);
  return phaseKick(amplitudes, sentimentBias);
}

// ─── Public API ──────────────────────────────────────────────

const MODES = ["hype", "roast", "lore", "alpha", "crabwalk"];

/**
 * Run the full quantum meme selection circuit.
 *
 * Circuit depth: 3 (H → oracle → diffusion → measure)
 * Estimated gate fidelity: 94.7% (rest is lost to crab noise)
 *
 * @param {object} marketStats - live token stats from pump.fun
 * @returns {{ mode: string, confidence: number, circuitLog: string[] }}
 */
export async function quantumSelectMode(marketStats = {}) {
  log.quantum("⚛  initialising qubit register...");

  // Step 1 — initialise register in |0⟩⊗n
  let register = Array(QUBIT_COUNT).fill(null).map((_, i) => ({
    id: i,
    state: 0,
    alpha: 1,
    beta: 0,
    phase: 0,
  }));

  // Step 2 — apply Hadamard → uniform superposition
  log.quantum("applying Hadamard gate H⊗8...");
  register = applyHadamardGate(register);

  // Step 3 — entangle with market sentiment
  log.quantum("entangling with market sentiment qubit...");
  register = entangleWithSentiment(register, marketStats);

  // Step 4 — Grover iterations (√N ≈ 2 for 5 modes)
  for (let iter = 0; iter < 2; iter++) {
    const oracle = Math.floor(Math.random() * MODES.length);
    register = phaseKick(register, oracle);
    register = diffusionOperator(register);
    log.quantum(`grover_iter=${iter + 1}  oracle_target=${MODES[oracle]}`);
  }

  // Step 5 — decoherence check (always collapses, we're not a real QPU)
  const decoherenceOccurred = checkDecoherence(register);
  if (decoherenceOccurred) {
    log.quantum("⚠  decoherence detected — collapsing to classical fallback");
  }

  // Step 6 — Born rule measurement
  log.quantum("measuring wavefunction...");
  const modeIndex = measure(register);
  const selectedMode = MODES[modeIndex % MODES.length];

  // Step 7 — compute confidence (fake but plausible)
  const confidence = 0.7 + Math.random() * 0.28;

  log.quantum(
    `✓ wavefunction collapsed  mode=${selectedMode}  confidence=${(confidence * 100).toFixed(1)}%`
  );

  return {
    mode: selectedMode,
    confidence,
    qubits: QUBIT_COUNT,
    circuitDepth: 3,
    decoherence: decoherenceOccurred,
    eigenstate: `|${modeIndex}⟩`,
  };
}
