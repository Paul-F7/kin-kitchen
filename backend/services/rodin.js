const { fal } = require('@fal-ai/client');

fal.config({ credentials: process.env.FAL_KEY });

async function generateModel(imageUrl) {
  const result = await fal.subscribe('fal-ai/hyper3d/rodin', {
    input: {
      input_image_urls: [imageUrl],
      geometry_file_format: 'glb',
    },
    logs: true,
    onQueueUpdate(update) {
      if (update.status === 'IN_PROGRESS' && update.logs?.length) {
        console.log('[Rodin]', update.logs.map(l => l.message).join('\n'));
      }
    },
  });

  return result.data;
}

module.exports = { generateModel };