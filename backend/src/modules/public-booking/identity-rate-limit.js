const crypto = require('node:crypto');
const { normalizePair, denied } = require('./identity-policy');

// Process-local, bounded, no raw PII. Restart resets counters; multi-instance needs shared limits.
function createIdentityLimiter({ now = Date.now, secret = crypto.randomBytes(32), pairLimit = 5, ipLimit = 30, totalLimit = 300, windowMs = 15 * 60 * 1000 } = {}) {
  const counters = new Map();
  const digest = (value) => crypto.createHmac('sha256', secret).update(value).digest('hex');
  function consume(key, limit) {
    const time = now();
    for (const [entry, value] of counters) if (value.expires <= time) counters.delete(entry);
    const current = counters.get(key) || { count: 0, expires: time + windowMs };
    if (current.count >= limit) {
      const error = denied('IDENTITY_RATE_LIMIT');
      error.statusCode = 429;
      throw error;
    }
    current.count++;
    counters.set(key, current);
  }
  return function limit(req, res, next) {
    res.set('Cache-Control', 'no-store');
    const credential = req.path?.endsWith('/identity') ? req.body?.token
      : req.path?.endsWith('/appointments') ? req.body?.client_context?.client_token : null;
    if (credential) return next();
    // A page visit without submitted identity does not consume recovery attempts.
    const input = req.body?.cliente || req.body;
    if (!input?.telefone && !input?.data_nascimento) return next();
    try {
      consume('aggregate', totalLimit);
      consume(`ip:${digest(req.ip || req.socket?.remoteAddress || 'unknown')}`, ipLimit);
      const pair = normalizePair(input);
      consume(`pair:${digest(JSON.stringify(pair))}`, pairLimit);
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { createIdentityLimiter, identityLimiter: createIdentityLimiter() };
