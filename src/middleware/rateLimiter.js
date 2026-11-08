/**
 * Lightweight Zero-Dependency In-Memory Rate Limiter
 */
const rateLimitBuckets = new Map();

function rateLimiter({ windowMs = 60000, max = 60, message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let bucket = rateLimitBuckets.get(ip);
    if (!bucket || now - bucket.resetTime > windowMs) {
      bucket = { count: 1, resetTime: now };
      rateLimitBuckets.set(ip, bucket);
    } else {
      bucket.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((bucket.resetTime + windowMs) / 1000));

    if (bucket.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
        },
      });
    }

    next();
  };
}

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.resetTime > 300000) {
      rateLimitBuckets.delete(ip);
    }
  }
}, 300000).unref();

module.exports = rateLimiter;
