require('dotenv').config();

// DB can be provided as DATABASE_URL (Neon/Supabase) OR as individual DB_* fields
const hasDbUrl = !!process.env.DATABASE_URL;
const hasDbFields = process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD;

if (!hasDbUrl && !hasDbFields) {
  throw new Error(
    'Database not configured. Set DATABASE_URL (for Neon/Supabase) or DB_HOST + DB_NAME + DB_USER + DB_PASSWORD'
  );
}

const alwaysRequired = [
  'JWT_SECRET',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
];

for (const key of alwaysRequired) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
