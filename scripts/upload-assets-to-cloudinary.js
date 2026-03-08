/**
 * upload-assets-to-cloudinary.js
 * Uploads all local assets/* to Cloudinary and writes
 * frontend/js/asset-urls.js with a CDN URL map for Vercel deployment.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const cloudinary = require('cloudinary').v2;
const fs   = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const OUT_FILE   = path.resolve(__dirname, '..', 'frontend', 'js', 'asset-urls.js');
const FOLDER     = 'kin-kitchen';

function walk(dir, rel = '') {
  const entries = [];
  for (const f of fs.readdirSync(dir)) {
    const full    = path.join(dir, f);
    const relPath = rel ? `${rel}/${f}` : f;
    if (fs.statSync(full).isDirectory()) entries.push(...walk(full, relPath));
    else entries.push({ full, rel: relPath });
  }
  return entries;
}

async function uploadFile({ full, rel }) {
  const ext          = path.extname(rel).toLowerCase();
  const isVideo      = ['.mp4', '.mov', '.webm'].includes(ext);
  const resourceType = isVideo ? 'video' : 'raw';
  const subFolder    = path.dirname(rel) === '.' ? FOLDER : `${FOLDER}/${path.dirname(rel)}`;

  console.log(`⬆  ${rel} ...`);
  try {
    const result = await cloudinary.uploader.upload(full, {
      resource_type: resourceType,
      folder: subFolder,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    console.log(`   ✓ ${result.secure_url}`);
    return { rel, url: result.secure_url };
  } catch (err) {
    console.error(`   ✗ ${rel}: ${err.message}`);
    return { rel, url: null };
  }
}

async function main() {
  const files   = walk(ASSETS_DIR).filter(f => !f.rel.includes('b0095b1b')); // skip temp file
  const results = [];

  for (const file of files) {
    const r = await uploadFile(file);
    if (r.url) results.push(r);
  }

  const entries = results.map(({ rel, url }) =>
    `  ${JSON.stringify('/assets/' + rel)}: ${JSON.stringify(url)}`
  );

  const output = `/* AUTO-GENERATED — do not edit manually */
/* Maps local /assets/* paths to Cloudinary CDN URLs for production */
window.ASSET_URLS = {
${entries.join(',\n')}
};
window.assetUrl = function(p) { return window.ASSET_URLS[p] || p; };
`;

  fs.writeFileSync(OUT_FILE, output, 'utf8');
  console.log(`\n✅ Done! ${results.length}/${files.length} files. Map → ${OUT_FILE}`);
}

main().catch(err => { console.error(err); process.exit(1); });
