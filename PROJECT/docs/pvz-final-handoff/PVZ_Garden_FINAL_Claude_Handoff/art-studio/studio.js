/* PVZ Garden browser-only reviewer. Vanilla JS. Never writes game assets or save keys. */
(() => {
  'use strict';
  const KEY = 'pvz-garden:art-studio:reviews:v1';
  const $ = id => document.getElementById(id);
  const state = {
    original: null,
    candidate: null,
    originalName: '',
    candidateName: '',
    reviews: {},
    currentId: '',
  };

  function readReviews() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch { return {}; }
  }
  function storeReviews() {
    try { localStorage.setItem(KEY, JSON.stringify(state.reviews)); }
    catch (err) { console.warn('Local review persistence unavailable:', err); }
  }
  state.reviews = readReviews();

  function reviewId() { return $('sprite-id').value.trim(); }
  function currentReview() { return state.reviews[reviewId()] || { status: 'pending', notes: '' }; }

  function showReview() {
    const review = currentReview();
    $('notes').value = review.notes || '';
    $('review-status').textContent = {
      approved: 'Approved — review metadata saved locally (not deployed).',
      revision: 'Needs revision — review metadata saved locally.',
      pending: 'Pending — no approval recorded.'
    }[review.status] || 'Pending — no approval recorded.';
  }

  function saveReview(status = currentReview().status) {
    const id = reviewId();
    if (!id) { $('review-status').textContent = 'Enter a Sprite ID before saving a review.'; return; }
    const original = state.original, candidate = state.candidate;
    state.reviews[id] = {
      status,
      notes: $('notes').value,
      original: state.originalName,
      candidate: state.candidateName,
      originalDimensions: original ? [original.naturalWidth, original.naturalHeight] : null,
      candidateDimensions: candidate ? [candidate.naturalWidth, candidate.naturalHeight] : null,
      updatedAt: new Date().toISOString()
    };
    storeReviews();
    showReview();
  }

  function inspectMeta(img, name) {
    if (!img) return 'No image selected';
    return `${name} · ${img.naturalWidth} × ${img.naturalHeight} px · ` +
      `${(img.naturalWidth * img.naturalHeight).toLocaleString()} source pixels`;
  }

  function background(ctx, w, h, type, zoom) {
    if (type === 'cream' || type === 'dark') {
      ctx.fillStyle = type === 'cream' ? '#FEF6DD' : '#29243D';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const tile = Math.max(8, 8 * zoom);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e1e5e6';
    for (let y = 0; y < h; y += tile) for (let x = 0; x < w; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }

  function renderOne(kind) {
    const canvas = $(`${kind}-canvas`);
    const ctx = canvas.getContext('2d');
    const zoom = Number($('zoom').value);
    const refW = Math.max(64, state.original?.naturalWidth || 0, state.candidate?.naturalWidth || 0);
    const refH = Math.max(64, state.original?.naturalHeight || 0, state.candidate?.naturalHeight || 0);
    // Browser memory safety: concept posters are NOT native sprites.
    // Avoid allocating tens of megapixels on iPhones at 4× or 8×.
    const proposedW = refW * zoom, proposedH = refH * zoom;
    if (proposedW > 4096 || proposedH > 4096 || proposedW * proposedH > 12000000) {
      canvas.width = 320; canvas.height = 80;
      canvas.style.width = '320px'; canvas.style.height = '80px';
      ctx.fillStyle = '#29243D'; ctx.font = '14px sans-serif';
      ctx.fillText('Image too large at this zoom.', 12, 30);
      ctx.fillText('Choose a smaller zoom / sprite PNG.', 12, 52);
      return;
    }
    // Keep each pixel exact: no CSS auto-fit that could introduce fractional scaling.
    canvas.width = refW * zoom;
    canvas.height = refH * zoom;
    canvas.style.width = `${refW * zoom}px`;
    canvas.style.height = `${refH * zoom}px`;
    ctx.imageSmoothingEnabled = false;
    background(ctx, canvas.width, canvas.height, $('background').value, zoom);
    const img = state[kind];
    if (img) {
      const dx = Math.floor((refW - img.naturalWidth) / 2) * zoom;
      const dy = Math.floor((refH - img.naturalHeight) / 2) * zoom;
      ctx.drawImage(img, dx, dy, img.naturalWidth * zoom, img.naturalHeight * zoom);
    }
    if ($('grid').checked && zoom >= 4 && refW <= 256 && refH <= 256) {
      ctx.strokeStyle = 'rgba(38,32,59,.2)'; ctx.lineWidth = 1;
      for (let x = zoom + .5; x < canvas.width; x += zoom) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = zoom + .5; y < canvas.height; y += zoom) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    }
  }
  function render() { renderOne('original'); renderOne('candidate'); }

  async function loadImageFromFile(file, kind) {
    if (!file) return;
    if (file.type && file.type !== 'image/png') {
      alert('Please select a PNG file.'); return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Cannot load PNG'));
        img.src = objectUrl;
      });
      state[kind] = img;
      state[`${kind}Name`] = file.name;
      $(`${kind}-meta`).textContent = inspectMeta(img, file.name);
      render();
    } catch (err) { alert(`Error: ${err.message}`); }
    finally { URL.revokeObjectURL(objectUrl); }
  }

  $('original-file').addEventListener('change', e => loadImageFromFile(e.target.files?.[0], 'original'));
  $('candidate-file').addEventListener('change', e => loadImageFromFile(e.target.files?.[0], 'candidate'));
  for (const id of ['zoom', 'background', 'grid']) $(id).addEventListener('change', render);
  $('sprite-id').addEventListener('change', showReview);
  $('sprite-id').addEventListener('blur', showReview);
  $('approve').addEventListener('click', () => saveReview('approved'));
  $('reject').addEventListener('click', () => saveReview('revision'));
  $('pending').addEventListener('click', () => saveReview('pending'));
  $('notes').addEventListener('change', () => {
    if (reviewId()) saveReview(currentReview().status);
  });
  $('export').addEventListener('click', () => {
    const report = {
      schema: 'pvz-garden-art-review/v1',
      exportedAt: new Date().toISOString(),
      note: 'Metadata only. PNG files must be provided separately. Approval is not a deployment.',
      reviews: state.reviews
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'pvz-garden-art-reviews.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('import').addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.schema !== 'pvz-garden-art-review/v1' ||
          !parsed.reviews || typeof parsed.reviews !== 'object' || Array.isArray(parsed.reviews)) {
        throw new Error('Not a PVZ Garden art review export');
      }
      for (const [id, r] of Object.entries(parsed.reviews)) {
        if (!id || !r || typeof r !== 'object') continue;
        if (!['pending','approved','revision'].includes(r.status)) continue;
        state.reviews[id] = {
          status: r.status,
          notes: typeof r.notes === 'string' ? r.notes.slice(0, 10000) : '',
          original: String(r.original || ''),
          candidate: String(r.candidate || ''),
          originalDimensions: Array.isArray(r.originalDimensions) ? r.originalDimensions : null,
          candidateDimensions: Array.isArray(r.candidateDimensions) ? r.candidateDimensions : null,
          updatedAt: String(r.updatedAt || '')
        };
      }
      storeReviews(); showReview();
      alert('Review metadata imported. You must reselect image files to compare them.');
    } catch (err) { alert(`Import failed: ${err.message}`); }
    e.target.value = '';
  });
  showReview(); render();
})();
