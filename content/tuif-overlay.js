/**
 * Screenshot TUIF - In-Page Overlay Script
 * Activates directly on the current tab without opening any new page or popup.
 */

(() => {
  if (window.__TUIF_INITIALIZED__) return;
  window.__TUIF_INITIALIZED__ = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ACTIVATE_TUIF_OVERLAY') {
      openTuifOverlay(message.dataUrl);
      sendResponse({ success: true });
    }
    return true;
  });

  function openTuifOverlay(dataUrl) {
    const existing = document.getElementById('tuif-overlay-container');
    if (existing) existing.remove();

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const container = document.createElement('div');
    container.id = 'tuif-overlay-container';

    container.innerHTML = `
      <canvas id="tuif-base-canvas"></canvas>
      <canvas id="tuif-preview-canvas"></canvas>
      <div id="tuif-frame"></div>
      
      <!-- Top Right Close Button -->
      <button id="tuif-close-btn" title="Close (Esc)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Bottom Floating Pill Toolbar -->
      <div id="tuif-pill-toolbar">
        <!-- Undo -->
        <button class="tuif-pill-btn" id="tuif-btn-undo" title="Undo (Ctrl+Z)" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
          </svg>
        </button>

        <!-- Redo -->
        <button class="tuif-pill-btn" id="tuif-btn-redo" title="Redo (Ctrl+Y)" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 14 20 9 15 4"></polyline>
            <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
          </svg>
        </button>

        <!-- Copy (Saves to Ephemeral directory & copies path) -->
        <button class="tuif-pill-btn" id="tuif-btn-copy" title="Copy Ephemeral Path for Terminal (Ctrl+C)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>

        <!-- Download (Saves permanently to Downloads & copies path) -->
        <button class="tuif-pill-btn" id="tuif-btn-download" title="Save Permanently & Copy Path (Ctrl+S)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>

      <!-- Toast Feedback -->
      <div id="tuif-toast">
        <div class="tuif-toast-icon">✓</div>
        <div class="tuif-toast-body">
          <div class="tuif-toast-title" id="tuif-toast-title">Copied to clipboard!</div>
          <div class="tuif-toast-path" id="tuif-toast-path"></div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(container);

    const baseCanvas = container.querySelector('#tuif-base-canvas');
    const previewCanvas = container.querySelector('#tuif-preview-canvas');
    const baseCtx = baseCanvas.getContext('2d');
    const previewCtx = previewCanvas.getContext('2d');

    baseCanvas.width = Math.round(width * dpr);
    baseCanvas.height = Math.round(height * dpr);
    previewCanvas.width = Math.round(width * dpr);
    previewCanvas.height = Math.round(height * dpr);

    baseCtx.scale(dpr, dpr);
    previewCtx.scale(dpr, dpr);

    const btnClose = container.querySelector('#tuif-close-btn');
    const btnUndo = container.querySelector('#tuif-btn-undo');
    const btnRedo = container.querySelector('#tuif-btn-redo');
    const btnCopy = container.querySelector('#tuif-btn-copy');
    const btnDownload = container.querySelector('#tuif-btn-download');
    const toast = container.querySelector('#tuif-toast');
    const toastTitle = container.querySelector('#tuif-toast-title');
    const toastPath = container.querySelector('#tuif-toast-path');

    const currentColor = '#EF4444'; // Red default
    const strokeWidth = 3.5;
    let isDrawing = false;
    let points = [];

    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 30;

    function pushHistory() {
      if (undoStack.length >= MAX_HISTORY) undoStack.shift();
      undoStack.push(baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height));
      redoStack.length = 0;
      updateHistoryButtons();
    }

    function updateHistoryButtons() {
      btnUndo.disabled = undoStack.length <= 1;
      btnRedo.disabled = redoStack.length === 0;
    }

    function undo() {
      if (undoStack.length <= 1) return;
      const current = undoStack.pop();
      redoStack.push(current);
      const prev = undoStack[undoStack.length - 1];
      baseCtx.putImageData(prev, 0, 0);
      updateHistoryButtons();
    }

    function redo() {
      if (redoStack.length === 0) return;
      const next = redoStack.pop();
      undoStack.push(next);
      baseCtx.putImageData(next, 0, 0);
      updateHistoryButtons();
    }

    const img = new Image();
    img.onload = () => {
      baseCtx.drawImage(img, 0, 0, width, height);
      pushHistory();
    };
    img.src = dataUrl;

    function getPoint(e) {
      return { x: e.clientX, y: e.clientY };
    }

    function drawStroke(ctx, pts) {
      if (pts.length === 0) return;
      ctx.save();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      if (pts.length === 1) {
        ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
      } else {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    previewCanvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDrawing = true;
      const pt = getPoint(e);
      points = [pt];
      drawStroke(previewCtx, points);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const pt = getPoint(e);
      points.push(pt);
      previewCtx.clearRect(0, 0, width, height);
      drawStroke(previewCtx, points);
    });

    window.addEventListener('mouseup', () => {
      if (!isDrawing) return;
      isDrawing = false;
      previewCtx.clearRect(0, 0, width, height);
      drawStroke(baseCtx, points);
      points = [];
      pushHistory();
    });

    function closeOverlay() {
      window.removeEventListener('keydown', onKeyDown, true);
      container.remove();
    }

    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOverlay();
    });

    btnUndo.addEventListener('click', (e) => {
      e.stopPropagation();
      undo();
    });

    btnRedo.addEventListener('click', (e) => {
      e.stopPropagation();
      redo();
    });

    async function copyTextToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const success = document.execCommand('copy');
        ta.remove();
        return success;
      }
    }

    // 1. COPY ACTION (Ephemeral: Auto-cleans previous copied screenshots)
    async function handleCopy() {
      btnCopy.disabled = true;
      btnCopy.style.opacity = '0.5';

      try {
        const fullDataUrl = baseCanvas.toDataURL('image/png');

        const response = await chrome.runtime.sendMessage({
          type: 'COPY_EPHEMERAL',
          dataUrl: fullDataUrl
        });

        if (response && response.success && response.path) {
          const pathToCopy = response.path;
          await copyTextToClipboard(pathToCopy);

          toastTitle.textContent = 'Ephemeral path copied! (Auto-cleans on next copy)';
          toastPath.textContent = pathToCopy;
          toast.classList.add('show');

          setTimeout(() => {
            closeOverlay();
          }, 1800);
        } else {
          toastTitle.textContent = 'Copy Failed';
          toastPath.textContent = response?.error || 'Unknown error';
          toast.classList.add('show');
        }
      } catch (err) {
        console.error('Error in copy action:', err);
      } finally {
        btnCopy.disabled = false;
        btnCopy.style.opacity = '1';
      }
    }

    btnCopy.addEventListener('click', (e) => {
      e.stopPropagation();
      handleCopy();
    });

    // 2. DOWNLOAD ACTION (Permanent: Saved permanently & path copied to clipboard)
    async function handleDownload() {
      btnDownload.disabled = true;
      btnDownload.style.opacity = '0.5';

      try {
        const fullDataUrl = baseCanvas.toDataURL('image/png');

        const response = await chrome.runtime.sendMessage({
          type: 'DOWNLOAD_PERMANENT',
          dataUrl: fullDataUrl
        });

        if (response && response.success && response.path) {
          const pathToCopy = response.path;
          await copyTextToClipboard(pathToCopy);

          toastTitle.textContent = 'Saved permanently & path copied for terminal!';
          toastPath.textContent = pathToCopy;
          toast.classList.add('show');

          setTimeout(() => {
            closeOverlay();
          }, 2000);
        } else {
          toastTitle.textContent = 'Download Failed';
          toastPath.textContent = response?.error || 'Unknown error';
          toast.classList.add('show');
        }
      } catch (err) {
        console.error('Error downloading:', err);
      } finally {
        btnDownload.disabled = false;
        btnDownload.style.opacity = '1';
      }
    }

    btnDownload.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDownload();
    });

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        closeOverlay();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleDownload();
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
  }
})();
