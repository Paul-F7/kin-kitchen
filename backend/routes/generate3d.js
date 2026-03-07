const express = require('express');
const { generateModel } = require('../services/rodin');

const router = express.Router();

router.post('/', express.json(), async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  try {
    const result = await generateModel(imageUrl);
    res.json(result);
  } catch (err) {
    console.error('[generate3d]', err);
    res.status(500).json({ error: err.message || '3D generation failed' });
  }
});

module.exports = router;