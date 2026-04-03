const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
const allowedOrigins = [
  env.frontendUrl,
  'http://localhost:3000',
  'https://app.upnrise.com',
  'https://upnrise.com',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, '')))) {
        return callback(null, true);
      }
      // Also allow any *.vercel.app subdomain for preview deployments
      if (origin.endsWith('.vercel.app')) return callback(null, true);
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
