/* global renderAnalysis, mountAR, CookingAR, escapeHtml */
'use strict';

// ── Upload state machine ──────────────────────────────────────────────────────
const STEPS = [
  { id: 'step-upload',  label: 'Uploading photo…' },
  { id: 'step-analyse', label: 'Analysing ingredients…' },
  { id: 'step-3d',      label: 'Generating 3D preview…' },
];

function buildProgressHTML() {
  return `
    <div class="status-uploading" id="upload-progress" role="status" aria-live="polite">
      <div class="progress-steps">
        ${STEPS.map((s, i) => `
          <div class="progress-step ${i === 0 ? 'progress-step--active' : ''}" id="${s.id}">
            <div class="progress-step__dot">
              <div class="spinner${i === 0 ? '' : ' spinner--faint'}"></div>
            </div>
            <span>${s.label}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function setStep(stepIndex) {
  STEPS.forEach((s, i) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    el.classList.toggle('progress-step--active',   i === stepIndex);
    el.classList.toggle('progress-step--done',     i < stepIndex);
    el.classList.toggle('progress-step--inactive', i > stepIndex);
    const spinner = el.querySelector('.spinner');
    if (spinner) spinner.classList.toggle('spinner--faint', i !== stepIndex);
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('file');
  const resultEl  = document.getElementById('result');
  const btn       = document.getElementById('uploadBtn');

  if (!fileInput.files.length) {
    showError(resultEl, 'Please select an image or video first.');
    return;
  }

  if (window.CookingAR) CookingAR.unmount();

  btn.disabled = true;
  resultEl.innerHTML = buildProgressHTML();

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    setStep(0);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });

    setStep(1);
    await new Promise(r => setTimeout(r, 120));

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

    setStep(2);
    resultEl.innerHTML = renderAnalysis(data);

    // Give browser 300ms to paint before mounting WebGL
    setTimeout(() => mountAR(data), 300);

    // Offer 3D mesh generation if it's an image (teammate feature)
    const file = fileInput.files[0];
    if (file && file.type.startsWith('image/') && data.url) {
      if (typeof addGenerate3dButton === 'function') addGenerate3dButton(data.url);
    }

  } catch (err) {
    showError(resultEl, err.message || 'Something went wrong. Please try again.');
  } finally {
    btn.disabled = false;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showError(container, message) {
  container.innerHTML = `
    <div class="status-error" role="alert">
      <span class="status-error__icon" aria-hidden="true">⚠️</span>
      ${escapeHtml(message)}
    </div>`;
}
