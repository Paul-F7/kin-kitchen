/**
 * Cloudinary delivery helpers — labeled image URL for ingredient clicks.
 * GET /api/cloudinary/label-url?publicId=...&label=... → { url }
 */
const express = require('express');
const { getLabeledImageUrl } = require('../services/cloudinary');

const router = express.Router();

router.get('/label-url', (req, res) => {
  const publicId = (req.query.publicId || '').trim();
  const label = (req.query.label || '').trim();
  if (!publicId || !label) {
    return res.status(400).json({ error: 'Missing publicId or label' });
  }
  const url = getLabeledImageUrl(publicId, label);
  if (!url) {
    return res.status(503).json({ error: 'Cloudinary not configured' });
  }
  res.json({ url });
});

module.exports = router;
