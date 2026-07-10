const logger = {
  info: (...args) => console.log('[GMAO]', ...args),
  warn: (...args) => console.warn('[GMAO]', ...args),
  error: (...args) => console.error('[GMAO]', ...args),
  http: (...args) => console.log('[GMAO]', ...args),
}

module.exports = logger
