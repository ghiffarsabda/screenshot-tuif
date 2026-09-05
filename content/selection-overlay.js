(() => {
  // Prevent duplicate instances
  const existing = document.getElementById('tuif-selection-container');
  if (existing) existing.remove();

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  let selectedBox = null;

  const container = document.createElement('div');
  container.id = 'tuif-selection-container';

  container.innerHTML = `
    <div id="tuif-backdrop"></div>
    <div id="tuif-selection-box">
      <div id="tuif-info-badge">0 × 0 px</div>
      <div id="tuif-action-bar" style="display:none;">
        <button class="tuif-btn tuif-btn-confirm" id="tuif-btn-capture">
          <span>✓ Capture</span>
        </button>
        <button class="tuif-btn tuif-btn-cancel" id="tuif-btn-cancel">
          <span>✕ Cancel</span>
        </button>
      </div>
    </div>
    <div id="tuif-hint">
      <span>Drag to select area</span>
      <kbd>Enter</kbd> to capture
      <kbd>Esc</kbd> to cancel
    </div>
  `;

  document.body.appendChild(container);

  const box = container.querySelector('#tuif-selection-box');
  const infoBadge = container.querySelector('#tuif-info-badge');
  const actionBar = container.querySelector('#tuif-action-bar');
  const btnCapture = container.querySelector('#tuif-btn-capture');
  const btnCancel = container.querySelector('#tuif-btn-cancel');

  function cleanup() {
    window.removeEventListener('keydown', onKeyDown, true);
    container.remove();
  }

  function getNormalizedCoords() {
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);
    return { x, y, width: w, height: h };
  }

  function updateBox() {
    const { x, y, width, height } = getNormalizedCoords();
    box.style.display = 'block';
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;

    const dpr = window.devicePixelRatio || 1;
    infoBadge.textContent = `${Math.round(width * dpr)} × ${Math.round(height * dpr)} px`;

    // Position badge above or below depending on space
    if (y < 40) {
      infoBadge.style.top = '6px';
      infoBadge.style.left = '6px';
    } else {
      infoBadge.style.top = '-32px';
      infoBadge.style.left = '0';
    }

    // Position action bar
    if (window.innerHeight - (y + height) < 60) {
      actionBar.style.bottom = '8px';
      actionBar.style.right = '8px';
    } else {
      actionBar.style.bottom = '-44px';
      actionBar.style.right = '0';
    }
  }

  function confirmCapture() {
    const coords = selectedBox || getNormalizedCoords();
    if (coords.width < 10 || coords.height < 10) {
      // Too small, dismiss
      cleanup();
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const finalCoords = {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      dpr: dpr
    };

    cleanup();

    // Notify background script to capture tab and crop
    chrome.runtime.sendMessage({
      type: 'AREA_SELECTED',
      coords: finalCoords
    });
  }

  container.addEventListener('mousedown', (e) => {
    // If clicked on action buttons, let them handle it
    if (e.target.closest('#tuif-action-bar')) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
    actionBar.style.display = 'none';
    updateBox();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX;
    currentY = e.clientY;
    updateBox();
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    currentX = e.clientX;
    currentY = e.clientY;
    const coords = getNormalizedCoords();
    if (coords.width >= 10 && coords.height >= 10) {
      selectedBox = coords;
      actionBar.style.display = 'flex';
    } else {
      box.style.display = 'none';
      selectedBox = null;
    }
  });

  btnCapture.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmCapture();
  });

  btnCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    cleanup();
  });

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    } else if (e.key === 'Enter') {
      if (selectedBox) {
        confirmCapture();
      }
    }
  }

  window.addEventListener('keydown', onKeyDown, true);
})();
