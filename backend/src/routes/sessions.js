const router = require('express').Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const {
  listScenarios,
  startSession,
  processTurn,
  processTextTurn,
  completeSession,
  listSessions,
  getSession,
} = require('../controllers/sessionController');

// Store audio in memory (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`));
    }
  },
});

router.use(authenticate);

router.get('/scenarios', listScenarios);
router.get('/', listSessions);
router.post('/', startSession);
router.get('/:id', getSession);
router.post('/:id/turn', upload.single('audio'), processTurn);   // legacy Whisper route
router.post('/:id/text-turn', processTextTurn);                    // browser STT route
router.post('/:id/complete', completeSession);

module.exports = router;
