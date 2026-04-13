const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Health check — registered before all other middleware so it is always
// reachable regardless of CORS, rate-limiting, or auth configuration.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Security
app.use(helmet());

// Build the list of explicitly allowed origins.
// BACKEND_URL / RAILWAY_PUBLIC_DOMAIN let the service whitelist its own
// public domain so that browser requests originating from the same host
// (e.g. the Railway-hosted URL hitting /health) are never blocked.
const allowedOrigins = [
  env.frontendUrl,
  process.env.BACKEND_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : undefined,
  'http://localhost:3000',
  'https://app.upnrise.com',
  'https://upnrise.com',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Allow any explicitly configured origin (strip trailing slashes before comparing)
      if (allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, '')))) {
        return callback(null, true);
      }

      // Allow any *.vercel.app subdomain for Vercel preview deployments
      if (origin.endsWith('.vercel.app')) return callback(null, true);

      // Allow the backend's own Railway domain (*.up.railway.app) so the
      // service can be reached from its own public URL without CORS errors.
      if (origin.endsWith('.up.railway.app')) return callback(null, true);

      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// Body parsing (5mb to support base64 avatar uploads)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Logging
if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/super-admin', apiLimiter, require('./routes/superAdmin'));
app.use('/api/company', apiLimiter, require('./routes/company'));
app.use('/api/topics', apiLimiter, require('./routes/topics'));
app.use('/api/sessions', apiLimiter, require('./routes/sessions'));
app.use('/api/admin', apiLimiter, require('./routes/admin'));

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
