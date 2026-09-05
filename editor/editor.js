/**
 * Screenshot TUIF - Full Annotation Suite & Terminal Path Copier
 */

// DOM Elements
const baseCanvas = document.getElementById('base-canvas');
const baseCtx = baseCanvas.getContext('2d');
const previewCanvas = document.getElementById('preview-canvas');
const previewCtx = previewCanvas.getContext('2d');
const canvasWrapper = document.getElementById('canvas-wrapper');
const canvasDims = document.getElementById('canvas-dims');
const viewport = document.getElementById('viewport');

const toolButtons = document.querySelectorAll('.tool-btn');
const colorSwatches = document.querySelectorAll('.color-swatch');
const customColorPicker = document.getElementById('custom-color-picker');
const sizeButtons = document.querySelectorAll('.size-btn');

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnClear = document.getElementById('btn-clear');

const formatSelect = document.getElementById('format-select');
const btnCopyPath = document.getElementById('btn-copy-path');
const btnCopyImage = document.getElementById('btn-copy-image');
const btnSaveFile = document.getElementById('btn-save-file');

const textOverlay = document.getElementById('text-overlay');
const textEditor = document.getElementById('text-editor');
const textSubmitBtn = document.getElementById('text-submit-btn');
const textCancelBtn = document.getElementById('text-cancel-btn');

const cropActions = document.getElementById('crop-actions');
const cropConfirmBtn = document.getElementById('crop-confirm-btn');
const cropCancelBtn = document.getElementById('crop-cancel-btn');

const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomFit = document.getElementById('btn-zoom-fit');
const btnZoom100 = document.getElementById('btn-zoom-100');
const zoomLevelLabel = document.getElementById('zoom-level');
const statusText = document.getElementById('status-text');

const toast = document.getElementById('toast');
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');

// State
let currentTool = 'pen';
let currentColor = '#EF4444'; // Red default as requested
let strokeWidth = 4;
let zoom = 1.0;
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let freehandPoints = [];
let pendingTextPos = null;
let pendingCrop = null;

// History stacks (store ImageData)
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 30;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadPreferences();
  await loadCaptureData();
  setupEventListeners();
  updateHistoryButtons();
});

// Load settings from storage
async function loadPreferences() {
  const stored = await chrome.storage.local.get(['subfolder', 'copyFormat', 'defaultColor']);
  if (stored.defaultColor) {
    setColor(stored.defaultColor);
  }
  if (stored.copyFormat) {
    formatSelect.value = stored.copyFormat;
  }
}

// Load captured screenshot
async function loadCaptureData() {
  statusText.textContent = 'Loading screenshot...';
  const urlParams = new URLSearchParams(window.location.search);
  const captureId = urlParams.get('id') || (await chrome.storage.local.get('latest_capture_id')).latest_capture_id;

  if (!captureId) {
    statusText.textContent = 'No screenshot found. Take a capture first.';
    return;
  }

  const result = await chrome.storage.local.get(captureId);
  const capture = result[captureId];

  if (!capture || !capture.dataUrl) {
    statusText.textContent = 'Screenshot data missing or expired.';
    return;
  }

  const img = new Image();
  img.onload = () => {
    if (capture.crop) {
      // Area selection crop
      const crop = capture.crop;
      const dpr = crop.dpr || 1;
      const sx = Math.round(crop.x * dpr);
      const sy = Math.round(crop.y * dpr);
      const sWidth = Math.round(crop.width * dpr);
      const sHeight = Math.round(crop.height * dpr);

      initCanvas(sWidth, sHeight);
      baseCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    } else {
      // Full tab
      initCanvas(img.naturalWidth, img.naturalHeight);
      baseCtx.drawImage(img, 0, 0);
    }

    pushHistoryState();
    fitToWindow();
    statusText.textContent = 'Screenshot ready. Annotate with red pen, shapes, or text.';
    
    // Clean up temporary capture record
    chrome.storage.local.remove(captureId);
  };
  img.src = capture.dataUrl;
}

function initCanvas(width, height) {
  baseCanvas.width = width;
  baseCanvas.height = height;
  previewCanvas.width = width;
  previewCanvas.height = height;

  canvasWrapper.style.width = width + 'px';
  canvasWrapper.style.height = height + 'px';
  canvasDims.textContent = `${width} × ${height} px`;
}

function pushHistoryState() {
  if (undoStack.length >= MAX_HISTORY) {
    undoStack.shift();
  }
  const snapshot = baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
  undoStack.push({
    width: baseCanvas.width,
    height: baseCanvas.height,
    data: snapshot
  });
  // Clear redo stack on new action
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
  if (prev.width !== baseCanvas.width || prev.height !== baseCanvas.height) {
    initCanvas(prev.width, prev.height);
  }
  baseCtx.putImageData(prev.data, 0, 0);
  updateHistoryButtons();
  showToast('Undo', 'Action reverted', 1000);
}

function redo() {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next);

  if (next.width !== baseCanvas.width || next.height !== baseCanvas.height) {
    initCanvas(next.width, next.height);
  }
  baseCtx.putImageData(next.data, 0, 0);
  updateHistoryButtons();
  showToast('Redo', 'Action restored', 1000);
}

function clearCanvas() {
  if (confirm('Clear all annotations on this screenshot?')) {
    if (undoStack.length > 0) {
      const initial = undoStack[0];
      if (initial.width !== baseCanvas.width || initial.height !== baseCanvas.height) {
        initCanvas(initial.width, initial.height);
      }
      baseCtx.putImageData(initial.data, 0, 0);
      pushHistoryState();
      showToast('Cleared', 'Annotations cleared');
    }
  }
}

// Convert screen mouse coordinates into exact canvas pixel coordinates
function getCanvasPoint(e) {
  const rect = previewCanvas.getBoundingClientRect();
  const scaleX = previewCanvas.width / rect.width;
  const scaleY = previewCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// Tool Selection & Palette
function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  
  // Hide overlays if switching away
  if (tool !== 'text') cancelTextOverlay();
  if (tool !== 'crop') cancelCrop();

  previewCanvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
  statusText.textContent = `Active Tool: ${tool.toUpperCase()}`;
}

function setColor(color) {
  currentColor = color;
  colorSwatches.forEach(swatch => {
    swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === color.toLowerCase());
  });
  customColorPicker.value = color.startsWith('#') && color.length === 7 ? color : '#EF4444';
}

function setStrokeWidth(width) {
  strokeWidth = parseInt(width, 10);
  sizeButtons.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === strokeWidth);
  });
}

// Drawing Logic
previewCanvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // Primary button only
  const pt = getCanvasPoint(e);
  startX = pt.x;
  startY = pt.y;
  currentX = pt.x;
  currentY = pt.y;
  isDrawing = true;

  if (currentTool === 'pen' || currentTool === 'highlighter') {
    freehandPoints = [{ x: pt.x, y: pt.y }];
  } else if (currentTool === 'text') {
    openTextOverlay(e.clientX, e.clientY, pt.x, pt.y);
    isDrawing = false;
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const pt = getCanvasPoint(e);
  currentX = pt.x;
  currentY = pt.y;

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  if (currentTool === 'pen') {
    freehandPoints.push({ x: pt.x, y: pt.y });
    drawFreehand(previewCtx, freehandPoints, currentColor, strokeWidth, false);
  } else if (currentTool === 'highlighter') {
    freehandPoints.push({ x: pt.x, y: pt.y });
    drawFreehand(previewCtx, freehandPoints, currentColor, strokeWidth * 4, true);
  } else if (currentTool === 'arrow') {
    drawArrow(previewCtx, startX, startY, currentX, currentY, currentColor, strokeWidth);
  } else if (currentTool === 'rect') {
    drawRect(previewCtx, startX, startY, currentX, currentY, currentColor, strokeWidth);
  } else if (currentTool === 'circle') {
    drawCircle(previewCtx, startX, startY, currentX, currentY, currentColor, strokeWidth);
  } else if (currentTool === 'blur') {
    drawBlurPreview(previewCtx, startX, startY, currentX, currentY);
  } else if (currentTool === 'crop') {
    drawCropPreview(previewCtx, startX, startY, currentX, currentY);
  }
});

window.addEventListener('mouseup', (e) => {
  if (!isDrawing) return;
  isDrawing = false;
  const pt = getCanvasPoint(e);
  currentX = pt.x;
  currentY = pt.y;

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  if (currentTool === 'pen') {
    freehandPoints.push({ x: pt.x, y: pt.y });
    drawFreehand(baseCtx, freehandPoints, currentColor, strokeWidth, false);
    freehandPoints = [];
    pushHistoryState();
  } else if (currentTool === 'highlighter') {
    freehandPoints.push({ x: pt.x, y: pt.y });
    drawFreehand(baseCtx, freehandPoints, currentColor, strokeWidth * 4, true);
    freehandPoints = [];
    pushHistoryState();
  } else if (currentTool === 'arrow') {
    drawArrow(baseCtx, startX, startY, currentX, currentY, currentColor, strokeWidth);
    pushHistoryState();
  } else if (currentTool === 'rect') {
    drawRect(baseCtx, startX, startY, currentX, currentY, currentColor, strokeWidth);
    pushHistoryState();
  } else if (currentTool === 'circle') {
    drawCircle(baseCtx, startX, startY, currentX, currentY, currentColor, strokeWidth);
    pushHistoryState();
  } else if (currentTool === 'blur') {
    applyBlur(startX, startY, currentX, currentY);
    pushHistoryState();
  } else if (currentTool === 'crop') {
    setupCropActions(startX, startY, currentX, currentY);
  }
});

// Shape Drawing Helpers
function drawFreehand(ctx, points, color, width, isHighlight) {
  if (points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isHighlight) {
    ctx.globalAlpha = 0.35;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1);
  } else {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawArrow(ctx, fromX, fromY, toX, toY, color, width) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(14, width * 3.5);

  // Arrow shaft
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Solid crisp arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRect(ctx, x1, y1, x2, y2, color, width) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  if (w < 2 || h < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawCircle(ctx, x1, y1, x2, y2, color, width) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const rx = Math.abs(x2 - x1) / 2;
  const ry = Math.abs(y2 - y1) / 2;
  if (rx < 2 || ry < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBlurPreview(ctx, x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);

  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function applyBlur(x1, y1, x2, y2) {
  const x = Math.max(0, Math.round(Math.min(x1, x2)));
  const y = Math.max(0, Math.round(Math.min(y1, y2)));
  const w = Math.min(baseCanvas.width - x, Math.round(Math.abs(x2 - x1)));
  const h = Math.min(baseCanvas.height - y, Math.round(Math.abs(y2 - y1)));

  if (w < 4 || h < 4) return;

  const imgData = baseCtx.getImageData(x, y, w, h);
  const data = imgData.data;
  const blockSize = Math.max(8, Math.round(strokeWidth * 2.5));

  // Pixelate algorithm
  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      let r = 0, g = 0, b = 0, count = 0;

      // Sample block average
      for (let dy = 0; dy < blockSize && (by + dy) < h; dy++) {
        for (let dx = 0; dx < blockSize && (bx + dx) < w; dx++) {
          const idx = ((by + dy) * w + (bx + dx)) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }

      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Fill block
        for (let dy = 0; dy < blockSize && (by + dy) < h; dy++) {
          for (let dx = 0; dx < blockSize && (bx + dx) < w; dx++) {
            const idx = ((by + dy) * w + (bx + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }
  }

  baseCtx.putImageData(imgData, x, y);
}

// In-place Text Overlay
function openTextOverlay(screenX, screenY, canvasX, canvasY) {
  pendingTextPos = { canvasX, canvasY };
  textEditor.value = '';

  const rect = canvasWrapper.getBoundingClientRect();
  const localX = (screenX - rect.left) / zoom;
  const localY = (screenY - rect.top) / zoom;

  textOverlay.style.left = `${localX}px`;
  textOverlay.style.top = `${localY}px`;
  textOverlay.style.display = 'flex';
  textEditor.style.color = currentColor;
  textEditor.focus();
}

function submitText() {
  const text = textEditor.value.trim();
  if (text && pendingTextPos) {
    const fontSize = Math.max(16, strokeWidth * 4.5);
    baseCtx.save();
    baseCtx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.3;
    let maxWidth = 0;
    lines.forEach(l => {
      const m = baseCtx.measureText(l);
      if (m.width > maxWidth) maxWidth = m.width;
    });

    const padding = 8;
    const bgX = pendingTextPos.canvasX;
    const bgY = pendingTextPos.canvasY;
    const bgW = maxWidth + padding * 2;
    const bgH = lines.length * lineHeight + padding * 2;

    // Background pill for readability over dark or light screenshot backgrounds
    baseCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    baseCtx.beginPath();
    if (baseCtx.roundRect) {
      baseCtx.roundRect(bgX, bgY, bgW, bgH, 6);
    } else {
      baseCtx.rect(bgX, bgY, bgW, bgH);
    }
    baseCtx.fill();
    baseCtx.strokeStyle = currentColor;
    baseCtx.lineWidth = 1.5;
    baseCtx.stroke();

    // Text rendering
    baseCtx.fillStyle = currentColor;
    baseCtx.textBaseline = 'top';
    lines.forEach((line, i) => {
      baseCtx.fillText(line, bgX + padding, bgY + padding + i * lineHeight);
    });

    baseCtx.restore();
    pushHistoryState();
  }
  cancelTextOverlay();
}

function cancelTextOverlay() {
  textOverlay.style.display = 'none';
  textEditor.value = '';
  pendingTextPos = null;
}

textSubmitBtn.addEventListener('click', submitText);
textCancelBtn.addEventListener('click', cancelTextOverlay);
textEditor.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitText();
  } else if (e.key === 'Escape') {
    cancelTextOverlay();
  }
});

// Canvas Cropping
function drawCropPreview(ctx, x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);

  // Dim outer canvas
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.clearRect(x, y, w, h);

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function setupCropActions(x1, y1, x2, y2) {
  const x = Math.max(0, Math.round(Math.min(x1, x2)));
  const y = Math.max(0, Math.round(Math.min(y1, y2)));
  const w = Math.min(baseCanvas.width - x, Math.round(Math.abs(x2 - x1)));
  const h = Math.min(baseCanvas.height - y, Math.round(Math.abs(y2 - y1)));

  if (w < 20 || h < 20) {
    cancelCrop();
    return;
  }

  pendingCrop = { x, y, w, h };
  drawCropPreview(previewCtx, x, y, x + w, y + h);
  cropActions.style.display = 'flex';
}

function cancelCrop() {
  pendingCrop = null;
  cropActions.style.display = 'none';
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
}

cropCancelBtn.addEventListener('click', cancelCrop);
cropConfirmBtn.addEventListener('click', () => {
  if (!pendingCrop) return;
  const { x, y, w, h } = pendingCrop;

  const croppedData = baseCtx.getImageData(x, y, w, h);
  initCanvas(w, h);
  baseCtx.putImageData(croppedData, 0, 0);

  cancelCrop();
  pushHistoryState();
  fitToWindow();
  setTool('pen');
  showToast('Cropped', `Canvas resized to ${w} × ${h} px`, 2000);
});

// Zoom Handling
function setZoom(newZoom) {
  zoom = Math.min(3.0, Math.max(0.2, newZoom));
  canvasWrapper.style.transform = `scale(${zoom})`;
  zoomLevelLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function fitToWindow() {
  const pad = 60;
  const availW = viewport.clientWidth - pad;
  const availH = viewport.clientHeight - pad;
  const scaleW = availW / baseCanvas.width;
  const scaleH = availH / baseCanvas.height;
  const fit = Math.min(1.0, Math.min(scaleW, scaleH));
  setZoom(fit);
}

btnZoomIn.addEventListener('click', () => setZoom(zoom + 0.15));
btnZoomOut.addEventListener('click', () => setZoom(zoom - 0.15));
btnZoom100.addEventListener('click', () => setZoom(1.0));
btnZoomFit.addEventListener('click', fitToWindow);

// Event Listeners Setup
function setupEventListeners() {
  // Tool selector buttons
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  // Color Swatches
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => setColor(swatch.dataset.color));
  });

  customColorPicker.addEventListener('input', (e) => {
    setColor(e.target.value);
  });

  // Stroke Width
  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => setStrokeWidth(btn.dataset.size));
  });

  // History & Actions
  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);
  btnClear.addEventListener('click', clearCanvas);

  // Copy / Save Actions
  btnCopyPath.addEventListener('click', () => saveAndCopyPath());
  btnCopyImage.addEventListener('click', copyImageToClipboard);
  btnSaveFile.addEventListener('click', () => downloadScreenshot(false));

  formatSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ copyFormat: formatSelect.value });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
  // Ignore shortcuts if typing inside text editor or inputs
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

  const key = e.key.toLowerCase();

  // Undo: Ctrl+Z
  if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }
  // Redo: Ctrl+Y or Ctrl+Shift+Z
  if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
    return;
  }
  // Save File: Ctrl+S
  if ((e.ctrlKey || e.metaKey) && key === 's') {
    e.preventDefault();
    downloadScreenshot(false);
    return;
  }
  // Copy Path (TUI Friendly): Ctrl+C
  if ((e.ctrlKey || e.metaKey) && key === 'c') {
    e.preventDefault();
    saveAndCopyPath();
    return;
  }

  // Single key tool selectors
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    if (key === 'p') setTool('pen');
    else if (key === 'a') setTool('arrow');
    else if (key === 'r') setTool('rect');
    else if (key === 'c') setTool('circle');
    else if (key === 't') setTool('text');
    else if (key === 'h') setTool('highlighter');
    else if (key === 'b') setTool('blur');
    else if (key === 'x') setTool('crop');
    else if (key === '+' || key === '=') setZoom(zoom + 0.15);
    else if (key === '-') setZoom(zoom - 0.15);
    else if (key === '0') setZoom(1.0);
  }
}

// -------------------------------------------------------------
// CORE FEATURE: Save Annotated Image and Copy Path for Terminal
// -------------------------------------------------------------
async function saveAndCopyPath() {
  btnCopyPath.disabled = true;
  statusText.textContent = 'Saving annotated screenshot to disk...';

  try {
    const dataUrl = baseCanvas.toDataURL('image/png');
    const stored = await chrome.storage.local.get(['subfolder', 'copyFormat']);
    const subfolder = stored.subfolder || 'screenshot-tuif';
    const chosenFormat = formatSelect.value || stored.copyFormat || 'filepath';

    // Generate readable filename: screenshot_YYYY-MM-DD_HH-mm-ss.png
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${subfolder}/screenshot_${dateStr}.png`;

    // Download through Chrome downloads API
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    });

    // Wait for the download item to complete and get its absolute filesystem path
    const absolutePath = await waitForDownloadComplete(downloadId);

    // Format text according to user preference
    let textToCopy = absolutePath;
    if (chosenFormat === 'directory') {
      const idx = absolutePath.lastIndexOf('/');
      textToCopy = idx !== -1 ? absolutePath.slice(0, idx) : absolutePath;
    } else if (chosenFormat === 'markdown') {
      textToCopy = `![screenshot](${absolutePath})`;
    } else if (chosenFormat === 'quoted') {
      textToCopy = `"${absolutePath}"`;
    }

    // Copy to clipboard
    await navigator.clipboard.writeText(textToCopy);

    // Store in recent captures
    saveRecentCapture(textToCopy);

    showToast(
      'Path copied to clipboard! (TUI Friendly)',
      `Ready to paste into Antigravity CLI or shell:
${textToCopy}`,
      6000
    );
    statusText.textContent = `Saved & copied: ${textToCopy}`;
  } catch (err) {
    console.error('Error saving and copying path:', err);
    showToast('Failed to save or copy path', err.message, 4000);
    statusText.textContent = `Error: ${err.message}`;
  } finally {
    btnCopyPath.disabled = false;
  }
}

/**
 * Waits for chrome.downloads to finish and extracts the absolute filename
 */
function waitForDownloadComplete(downloadId) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Safety timeout: 10s
    const timer = setTimeout(async () => {
      if (resolved) return;
      chrome.downloads.onChanged.removeListener(changeListener);
      // Final query fallback
      const items = await chrome.downloads.search({ id: downloadId });
      if (items && items[0] && items[0].filename) {
        resolve(items[0].filename);
      } else {
        reject(new Error('Download timed out waiting for filesystem path'));
      }
    }, 10000);

    const checkItem = (item) => {
      if (item && item.state === 'complete' && item.filename) {
        resolved = true;
        clearTimeout(timer);
        chrome.downloads.onChanged.removeListener(changeListener);
        resolve(item.filename);
        return true;
      }
      return false;
    };

    // Check if already finished
    chrome.downloads.search({ id: downloadId }).then(items => {
      if (items && items.length > 0) {
        checkItem(items[0]);
      }
    });

    const changeListener = (delta) => {
      if (delta.id === downloadId) {
        if (delta.state && delta.state.current === 'complete') {
          chrome.downloads.search({ id: downloadId }).then(items => {
            if (items && items.length > 0) {
              checkItem(items[0]);
            }
          });
        } else if (delta.error) {
          resolved = true;
          clearTimeout(timer);
          chrome.downloads.onChanged.removeListener(changeListener);
          reject(new Error(`Download error: ${delta.error.current}`));
        }
      }
    };

    chrome.downloads.onChanged.addListener(changeListener);
  });
}

// Download Screenshot directly
async function downloadScreenshot(showSaveAs = false) {
  try {
    const dataUrl = baseCanvas.toDataURL('image/png');
    const stored = await chrome.storage.local.get(['subfolder']);
    const subfolder = stored.subfolder || 'screenshot-tuif';

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${subfolder}/screenshot_${dateStr}.png`;

    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: showSaveAs
    });

    showToast('Screenshot Saved', `Saved to ${filename}`, 3000);
  } catch (err) {
    showToast('Save Failed', err.message, 3000);
  }
}

// Copy Raw PNG Image to clipboard (for GUI apps)
async function copyImageToClipboard() {
  try {
    baseCanvas.toBlob(async (blob) => {
      if (!blob) {
        showToast('Error', 'Failed to generate image blob', 3000);
        return;
      }
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      showToast('Image Copied!', 'Raw PNG copied to clipboard for GUI apps.', 3000);
    }, 'image/png');
  } catch (err) {
    console.error('Failed to copy image:', err);
    showToast('Clipboard Error', err.message, 3000);
  }
}

// Save recent capture history
async function saveRecentCapture(path) {
  try {
    const stored = await chrome.storage.local.get('recent_captures');
    const list = stored.recent_captures || [];
    list.unshift({ path: path, time: Date.now() });
    await chrome.storage.local.set({ recent_captures: list.slice(0, 15) });
  } catch (e) {
    console.warn('Could not save recent capture:', e);
  }
}

// Toast notification helper
let toastTimeout = null;
function showToast(title, message, duration = 4000) {
  clearTimeout(toastTimeout);
  toastTitle.textContent = title;
  toastMessage.textContent = message || '';
  toast.classList.add('show');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
