/**
 * Screenshot TUIF - In-Page Overlay Script
 * Two annotation options:
 * 1. Component Select (Default, on the left):
 *    - Hover to inspect components.
 *    - Click to create crisp red outline boxes (no fill).
 *    - Click the same component twice to DESELECT it!
 *    - Multi-select supported.
 * 2. Freehand Draw (on the right):
 *    - Draw over manually with the red pen.
 * 
 * Copy options:
 * - Ctrl+C: Copy screenshot image path (ephemeral, auto-cleaning)
 * - Ctrl+Shift+C: Copy component code block (with screenshot path + exact HTML markup)
 * - Ctrl+S: Permanent download (also copies path)
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
    container.className = 'mode-select';

    container.innerHTML = `
      <canvas id="tuif-base-canvas"></canvas>
      <canvas id="tuif-preview-canvas"></canvas>
      <div id="tuif-frame"></div>
      <div id="tuif-component-tag"></div>
      
      <!-- Top Right Close Button -->
      <button id="tuif-close-btn" title="Close (Esc)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Bottom Floating Pill Toolbar -->
      <div id="tuif-pill-toolbar">
        <!-- Mode Switcher: Select Component on Left (Default), Draw on Right -->
        <div class="tuif-mode-group">
          <button class="tuif-mode-btn active" id="tuif-mode-select" title="Select Component (S)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="3 3"></rect>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Select Component</span>
          </button>
          <button class="tuif-mode-btn" id="tuif-mode-draw" title="Manual Draw (D)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            </svg>
            <span>Draw</span>
          </button>
        </div>

        <div class="tuif-toolbar-divider"></div>

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

        <!-- Copy Image Path (Ctrl+C) -->
        <button class="tuif-pill-btn" id="tuif-btn-copy" title="Copy Screenshot Path (Ctrl+C)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>

        <!-- Copy Component Code Block (Ctrl+Shift+C) -->
        <button class="tuif-pill-btn" id="tuif-btn-copy-code" title="Copy Component Code Block (Ctrl+Shift+C)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>

        <!-- Download (Permanent & copies path, Ctrl+S) -->
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
    const componentTag = container.querySelector('#tuif-component-tag');

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
    const btnCopyCode = container.querySelector('#tuif-btn-copy-code');
    const btnDownload = container.querySelector('#tuif-btn-download');
    const btnModeDraw = container.querySelector('#tuif-mode-draw');
    const btnModeSelect = container.querySelector('#tuif-mode-select');

    const toast = container.querySelector('#tuif-toast');
    const toastTitle = container.querySelector('#tuif-toast-title');
    const toastPath = container.querySelector('#tuif-toast-path');

    // Default mode: 'select'
    let currentMode = 'select';
    const annotationColor = '#EF4444'; // Red default
    const strokeWidth = 3.5;

    let isDrawing = false;
    let points = [];
    let hoveredElement = null;
    let hoveredRect = null;

    // Structured State for crisp rendering & deselecting
    const selectedComponents = [];
    const drawnStrokes = [];

    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 30;

    // Render entire scene cleanly
    function renderAll() {
      baseCtx.clearRect(0, 0, width, height);
      if (img.complete && img.naturalWidth > 0) {
        baseCtx.drawImage(img, 0, 0, width, height);
      }

      // Draw manual strokes
      for (const stroke of drawnStrokes) {
        drawStroke(baseCtx, stroke);
      }

      // Draw active selected component boxes (outline only)
      for (const comp of selectedComponents) {
        renderComponentBox(baseCtx, comp.rect);
      }
    }

    function saveState() {
      if (undoStack.length >= MAX_HISTORY) undoStack.shift();
      undoStack.push({
        components: selectedComponents.map(c => ({ ...c })),
        strokes: drawnStrokes.map(s => [...s])
      });
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

      selectedComponents.length = 0;
      selectedComponents.push(...prev.components.map(c => ({ ...c })));

      drawnStrokes.length = 0;
      drawnStrokes.push(...prev.strokes.map(s => [...s]));

      renderAll();
      updateHistoryButtons();
    }

    function redo() {
      if (redoStack.length === 0) return;
      const next = redoStack.pop();
      undoStack.push(next);

      selectedComponents.length = 0;
      selectedComponents.push(...next.components.map(c => ({ ...c })));

      drawnStrokes.length = 0;
      drawnStrokes.push(...next.strokes.map(s => [...s]));

      renderAll();
      updateHistoryButtons();
    }

    // Load frozen captured image
    const img = new Image();
    img.onload = () => {
      renderAll();
      saveState();
    };
    img.src = dataUrl;

    // Mode Switcher
    function setMode(mode) {
      currentMode = mode;
      btnModeSelect.classList.toggle('active', mode === 'select');
      btnModeDraw.classList.toggle('active', mode === 'draw');
      container.classList.toggle('mode-select', mode === 'select');

      previewCtx.clearRect(0, 0, width, height);
      componentTag.style.display = 'none';
      hoveredElement = null;
      hoveredRect = null;
    }

    btnModeSelect.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode('select');
    });

    btnModeDraw.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode('draw');
    });

    // Detect Webpage Component Under Cursor
    function getComponentAtPoint(clientX, clientY) {
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        if (!el || container.contains(el) || el === container) continue;
        if (el === document.documentElement || el === document.body) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width >= 12 && rect.height >= 12) {
          return { element: el, rect: rect };
        }
      }
      return null;
    }

    // Draw manual stroke
    function drawStroke(ctx, pts) {
      if (pts.length === 0) return;
      ctx.save();
      ctx.strokeStyle = annotationColor;
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

    // Render Crisp Red Box on Selected Component (Pure Outline, No Fill)
    function renderComponentBox(ctx, rect) {
      ctx.save();
      ctx.strokeStyle = annotationColor;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);

      const pad = 2;
      const x = Math.max(0, rect.left - pad);
      const y = Math.max(0, rect.top - pad);
      const w = rect.width + pad * 2;
      const h = rect.height + pad * 2;

      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, w, h);
      }
      ctx.restore();
    }

    // Clean Component HTML for Code Block
    function cleanComponentHTML(el) {
      if (!el) return '';
      const clone = el.cloneNode(true);

      // Truncate gigantic base64 inline images
      const images = clone.querySelectorAll('img');
      images.forEach(img => {
        if (img.src && img.src.startsWith('data:image/') && img.src.length > 120) {
          img.src = 'data:image/...[base64-truncated]';
        }
      });

      return clone.outerHTML.trim();
    }

    // Check if element is already selected
    function findSelectedIndex(el, rect) {
      return selectedComponents.findIndex(c => {
        if (c.element === el) return true;
        return (
          Math.abs(c.rect.left - rect.left) <= 3 &&
          Math.abs(c.rect.top - rect.top) <= 3 &&
          Math.abs(c.rect.width - rect.width) <= 3 &&
          Math.abs(c.rect.height - rect.height) <= 3
        );
      });
    }

    // Canvas Events
    previewCanvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      if (currentMode === 'draw') {
        isDrawing = true;
        points = [{ x: e.clientX, y: e.clientY }];
        drawStroke(previewCtx, points);
      } else if (currentMode === 'select') {
        const found = getComponentAtPoint(e.clientX, e.clientY);
        if (found && found.rect) {
          const existingIdx = findSelectedIndex(found.element, found.rect);

          if (existingIdx !== -1) {
            // DESELECT: remove from selected list!
            selectedComponents.splice(existingIdx, 1);
            renderAll();
            saveState();

            // Flash deselect indicator (dim dashed outline)
            previewCtx.clearRect(0, 0, width, height);
            previewCtx.save();
            previewCtx.strokeStyle = '#94a3b8';
            previewCtx.lineWidth = 2.5;
            previewCtx.setLineDash([4, 4]);
            previewCtx.strokeRect(found.rect.left - 2, found.rect.top - 2, found.rect.width + 4, found.rect.height + 4);
            previewCtx.restore();
            setTimeout(() => {
              previewCtx.clearRect(0, 0, width, height);
            }, 180);
          } else {
            // SELECT: add to selected list!
            selectedComponents.push({
              element: found.element,
              rect: found.rect,
              html: cleanComponentHTML(found.element)
            });
            renderAll();
            saveState();

            // Flash green select indicator in preview
            previewCtx.clearRect(0, 0, width, height);
            previewCtx.save();
            previewCtx.strokeStyle = '#22c55e';
            previewCtx.lineWidth = 3.5;
            previewCtx.strokeRect(found.rect.left - 2, found.rect.top - 2, found.rect.width + 4, found.rect.height + 4);
            previewCtx.restore();
            setTimeout(() => {
              previewCtx.clearRect(0, 0, width, height);
            }, 180);
          }
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (currentMode === 'draw') {
        if (!isDrawing) return;
        points.push({ x: e.clientX, y: e.clientY });
        previewCtx.clearRect(0, 0, width, height);
        drawStroke(previewCtx, points);
      } else if (currentMode === 'select') {
        if (e.target && (e.target.closest('#tuif-pill-toolbar') || e.target.closest('#tuif-close-btn'))) {
          previewCtx.clearRect(0, 0, width, height);
          componentTag.style.display = 'none';
          hoveredElement = null;
          hoveredRect = null;
          return;
        }

        const found = getComponentAtPoint(e.clientX, e.clientY);
        if (found) {
          hoveredElement = found.element;
          hoveredRect = found.rect;

          const isAlreadySelected = findSelectedIndex(hoveredElement, hoveredRect) !== -1;

          previewCtx.clearRect(0, 0, width, height);
          previewCtx.save();

          if (isAlreadySelected) {
            // Hovering an already selected component -> prompt deselect
            previewCtx.strokeStyle = '#f87171';
            previewCtx.lineWidth = 2.5;
            previewCtx.setLineDash([4, 4]);
          } else {
            previewCtx.strokeStyle = annotationColor;
            previewCtx.lineWidth = 2.5;
            previewCtx.setLineDash([6, 4]);
          }

          const pad = 2;
          const x = hoveredRect.left - pad;
          const y = hoveredRect.top - pad;
          const w = hoveredRect.width + pad * 2;
          const h = hoveredRect.height + pad * 2;

          previewCtx.strokeRect(x, y, w, h);
          previewCtx.restore();

          // Component Tag Badge
          const tag = hoveredElement.tagName.toLowerCase();
          const className = typeof hoveredElement.className === 'string' && hoveredElement.className
            ? '.' + hoveredElement.className.trim().split(/\s+/)[0]
            : '';
          const id = hoveredElement.id ? '#' + hoveredElement.id : '';

          if (isAlreadySelected) {
            componentTag.textContent = `<${tag}${id}${className}> (Click to deselect)`;
          } else {
            componentTag.textContent = `<${tag}${id}${className}> ${Math.round(hoveredRect.width)} × ${Math.round(hoveredRect.height)}`;
          }

          const tagTop = hoveredRect.top > 26 ? hoveredRect.top - 24 : hoveredRect.bottom + 6;
          const tagLeft = Math.max(8, Math.min(window.innerWidth - 220, hoveredRect.left));
          componentTag.style.top = `${tagTop}px`;
          componentTag.style.left = `${tagLeft}px`;
          componentTag.style.display = 'block';
        } else {
          previewCtx.clearRect(0, 0, width, height);
          componentTag.style.display = 'none';
          hoveredElement = null;
          hoveredRect = null;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (currentMode === 'draw' && isDrawing) {
        isDrawing = false;
        previewCtx.clearRect(0, 0, width, height);
        drawnStrokes.push([...points]);
        points = [];
        renderAll();
        saveState();
      }
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

    // 1. COPY IMAGE PATH ACTION (Ctrl+C — Ephemeral: Auto-cleans previous copied screenshots)
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

          toastTitle.textContent = 'Screenshot path copied! (Ctrl+C)';
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

    // 2. COPY COMPONENT CODE BLOCK ACTION (Ctrl+Shift+C)
    async function handleCopyComponentCode() {
      btnCopyCode.disabled = true;
      btnCopyCode.style.opacity = '0.5';

      try {
        let components = [...selectedComponents];

        // If user hasn't clicked to box any component yet, but is currently hovering over one in select mode:
        if (components.length === 0 && hoveredElement && hoveredRect) {
          components.push({
            element: hoveredElement,
            rect: hoveredRect,
            html: cleanComponentHTML(hoveredElement)
          });
          selectedComponents.push(components[0]);
          renderAll();
          saveState();
        }

        if (components.length === 0) {
          toastTitle.textContent = 'No Component Selected';
          toastPath.textContent = 'Select a component first (Click elements on the page).';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2500);
          return;
        }

        // Save annotated screenshot to ephemeral storage so prompt includes both image + code block!
        const fullDataUrl = baseCanvas.toDataURL('image/png');
        const response = await chrome.runtime.sendMessage({
          type: 'COPY_EPHEMERAL',
          dataUrl: fullDataUrl
        });

        const imagePath = response?.path || '';

        // Construct structured markdown code block output
        let output = '';
        if (imagePath) {
          output += `${imagePath}\n\n`;
        }

        if (components.length === 1) {
          const comp = components[0];
          const tag = comp.element.tagName.toLowerCase();
          const id = comp.element.id ? `#${comp.element.id}` : '';
          const cls = typeof comp.element.className === 'string' && comp.element.className
            ? '.' + comp.element.className.trim().split(/\s+/)[0]
            : '';

          output += `<!-- Component: <${tag}${id}${cls}> -->\n\`\`\`html\n${comp.html}\n\`\`\``;
        } else {
          output += `<!-- Selected Components (${components.length}) -->\n\n`;
          components.forEach((comp, idx) => {
            const tag = comp.element.tagName.toLowerCase();
            const id = comp.element.id ? `#${comp.element.id}` : '';
            const cls = typeof comp.element.className === 'string' && comp.element.className
              ? '.' + comp.element.className.trim().split(/\s+/)[0]
              : '';

            output += `<!-- Component ${idx + 1} of ${components.length}: <${tag}${id}${cls}> -->\n\`\`\`html\n${comp.html}\n\`\`\`\n\n`;
          });
        }

        await copyTextToClipboard(output.trim());

        toastTitle.textContent = `Component Code Copied! (Ctrl+Shift+C)`;
        const tagPreview = components.map(c => `<${c.element.tagName.toLowerCase()}>`).join(', ');
        toastPath.textContent = `Copied ${components.length} component block(s): ${tagPreview}`;
        toast.classList.add('show');

        setTimeout(() => {
          closeOverlay();
        }, 2000);

      } catch (err) {
        console.error('Error copying component code:', err);
        toastTitle.textContent = 'Copy Code Failed';
        toastPath.textContent = err.message;
        toast.classList.add('show');
      } finally {
        btnCopyCode.disabled = false;
        btnCopyCode.style.opacity = '1';
      }
    }

    btnCopyCode.addEventListener('click', (e) => {
      e.stopPropagation();
      handleCopyComponentCode();
    });

    // 3. DOWNLOAD ACTION (Permanent: Saved permanently & path copied to clipboard, Ctrl+S)
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
      } else if (e.key === 'd' || e.key === 'D') {
        setMode('draw');
      } else if (e.key === 's' || e.key === 'S') {
        setMode('select');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleCopyComponentCode();
        } else {
          handleCopy();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDownload();
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
  }
})();
