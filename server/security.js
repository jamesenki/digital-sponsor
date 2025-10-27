
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const securityMiddleware = (app) => {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.digitalsponsor.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000', 
      'http://172.22.234.178:7777',
      'http://172.22.234.178:8081'
    ],
    credentials: true
  }));

  // Rate limiting for crisis endpoints (higher limits)
  const crisisLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Higher limit for crisis situations
    message: 'Crisis support temporarily unavailable, please call 988'
  });

  // Standard rate limiting
  const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  });

  app.use('/api/crisis', crisisLimiter);
  app.use('/api', standardLimiter);
};

module.exports = securityMiddleware;
