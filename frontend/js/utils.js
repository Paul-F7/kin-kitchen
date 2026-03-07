'use strict';

/**
 * Escape user-provided strings before inserting into innerHTML.
 * Covers &, <, >, " and single quotes.
 * @param {unknown} s
 * @returns {string}
 */
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Format ingredient slot/name for display (e.g. butternut_squash_1 → Butternut squash).
 */
function formatIngredientLabel(name) {
  return String(name || '')
    .replace(/_/g, ' ')
    .replace(/\s+\d+$/, '')
    .trim()
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || 'Ingredient';
}

/**
 * Show a modal with the Cloudinary image labeled with the ingredient name.
 * Call when user clicks an ingredient (3D kitchen, detection, recipe).
 * @param {string} publicId - Cloudinary public_id of the uploaded image
 * @param {string} label - Ingredient name to overlay (e.g. "Butternut squash")
 */
function showIngredientLabel(publicId, label) {
  if (!publicId || !label) return;
  var params = new URLSearchParams({ publicId: publicId, label: label });
  fetch('/api/cloudinary/label-url?' + params.toString())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.url) return;
      var wrap = document.createElement('div');
      wrap.className = 'ingredient-label-modal';
      wrap.innerHTML =
        '<div class="ingredient-label-backdrop"></div>' +
        '<div class="ingredient-label-card">' +
          '<div class="ingredient-label-title">' + escapeHtml(formatIngredientLabel(label)) + '</div>' +
          '<img class="ingredient-label-img" src="' + escapeHtml(data.url) + '" alt="' + escapeHtml(label) + '">' +
          '<button type="button" class="ingredient-label-close">Close</button>' +
        '</div>';
      wrap.style.cssText =
        'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
      var backdrop = wrap.querySelector('.ingredient-label-backdrop');
      var card = wrap.querySelector('.ingredient-label-card');
      backdrop.style.cssText =
        'position:absolute;inset:0;background:rgba(0,0,0,0.7);cursor:pointer;';
      card.style.cssText =
        'position:relative;background:#FEFBF5;border-radius:16px;padding:16px;max-width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
      wrap.querySelector('.ingredient-label-title').style.cssText =
        'font-size:18px;font-weight:700;color:#1A0E04;margin-bottom:12px;';
      wrap.querySelector('.ingredient-label-img').style.cssText =
        'display:block;max-width:100%;height:auto;border-radius:8px;';
      wrap.querySelector('.ingredient-label-close').style.cssText =
        'margin-top:12px;width:100%;padding:10px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer;font-size:14px;';
      function close() {
        document.body.removeChild(wrap);
      }
      backdrop.addEventListener('click', close);
      wrap.querySelector('.ingredient-label-close').addEventListener('click', close);
      document.body.appendChild(wrap);
    })
    .catch(function () {});
}