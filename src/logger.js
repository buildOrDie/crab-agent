const ts = () => new Date().toISOString().slice(11, 23);

export const log = {
  info:    (msg) => console.log(`[${ts()}] 🦀 ${msg}`),
  quantum: (msg) => console.log(`[${ts()}] ⚛  \x1b[36m${msg}\x1b[0m`),
  warn:    (msg) => console.warn(`[${ts()}] ⚠  ${msg}`),
  error:   (msg) => console.error(`[${ts()}] ✗  ${msg}`),
};
