const router = require('express').Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const {
  startSession,
  processTurn,
  processTextTurn,
  completeSession,
  listSessions,
  getSession,
  generateTTS,
} = require('../controllers/sessionController');

// Store audio in memory (max 10MB)
// Accept all common browser audio MIME types including codecs variants
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Normalize: browser may send 'audio/webm;codecs=opus' etc.
    const baseType = file.mimetype.split(';')[0].trim();
    const allowed = ['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg'];
    if (allowed.includes(baseType)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`));
    }
  },
});

router.use(authenticate);

router.get('/', listSessions);
router.post('/', startSession);

// ── IMPORTANT: Static routes MUST come before /:id to avoid param collision ──
router.post('/tts', generateTTS);           // TTS — must be before /:id routes

router.get('/:id', getSession);
router.post('/:id/turn', upload.single('audio'), processTurn);   // Whisper STT
router.post('/:id/text-turn', processTextTurn);                  // browser STT fallback
router.post('/:id/complete', completeSession);

module.exports = router;
