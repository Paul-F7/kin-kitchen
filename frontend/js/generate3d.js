function addGenerate3dButton(imageUrl) {
  const container = document.getElementById('result');

  const section = document.createElement('div');
  section.className = 'analysis analysis--stacked';
  section.id = 'generate3d-section';

  const btn = document.createElement('button');
  btn.textContent = 'Generate 3D Model';
  btn.className = 'btn-3d';
  btn.addEventListener('click', () => handleGenerate3d(imageUrl, section));

  section.appendChild(btn);
  container.appendChild(section);
}

async function handleGenerate3d(imageUrl, section) {
  section.innerHTML = '<p>Generating 3D model… this may take a minute.</p>';

  try {
    const res = await fetch('/api/generate3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '3D generation failed');

    const modelUrl = findModelUrl(data);
    if (!modelUrl) {
      section.innerHTML = '<p class="error">No 3D model URL found in response.</p>'
        + '<pre style="font-size:0.75rem;max-height:200px;overflow:auto;">'
        + escapeHtml(JSON.stringify(data, null, 2)) + '</pre>';
      return;
    }

    section.innerHTML = '<h2>3D Model</h2>';

    const viewer = document.createElement('model-viewer');
    viewer.setAttribute('src', modelUrl);
    viewer.setAttribute('alt', 'Generated 3D model');
    viewer.setAttribute('auto-rotate', '');
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('shadow-intensity', '1');
    viewer.style.width = '100%';
    viewer.style.height = '400px';
    viewer.style.backgroundColor = '#1a1a1a';
    viewer.style.borderRadius = '6px';
    section.appendChild(viewer);

    const link = document.createElement('a');
    link.href = modelUrl;
    link.download = 'model.glb';
    link.textContent = 'Download GLB';
    link.className = 'btn-3d';
    link.style.display = 'inline-block';
    link.style.marginTop = '0.5rem';
    section.appendChild(link);
  } catch (err) {
    section.innerHTML = '<p class="error">' + escapeHtml(err.message) + '</p>';
  }
}

function findModelUrl(data) {
  if (data.model_mesh?.url) return data.model_mesh.url;
  if (data.outputs?.model_mesh?.url) return data.outputs.model_mesh.url;
  if (typeof data.model_mesh === 'string') return data.model_mesh;
  if (Array.isArray(data.outputs)) {
    const glb = data.outputs.find(o => o.file_name?.endsWith('.glb') || o.url?.endsWith('.glb'));
    if (glb) return glb.url;
  }
  return null;
}