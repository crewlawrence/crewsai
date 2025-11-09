const express = require('express');
const router = express.Router();
const captionController = require('../controllers/captionController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All caption routes require authentication
router.post(
  '/generate',
  authenticate,
  upload.single('image'),
  captionController.generateCaptions
);

router.get('/usage', authenticate, captionController.getUsage);

module.exports = router;