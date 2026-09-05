document.addEventListener('DOMContentLoaded', async () => {
  const btnCaptureVisible = document.getElementById('btn-capture-visible');
  const btnCaptureArea = document.getElementById('btn-capture-area');
  const subfolderInput = document.getElementById('setting-subfolder');
  const copyFormatSelect = document.getElementById('setting-copy-format');
  const colorDots = document.querySelectorAll('.color-dot');
  const recentContainer = document.getElementById('recent-container');
  const recentList = document.getElementById('recent-list');

  // Load saved settings
  const stored = await chrome.storage.local.get(['subfolder', 'copyFormat', 'defaultColor', 'recent_captures']);
  const subfolder = stored.subfolder || 'screenshot-tuif';
  const copyFormat = stored.copyFormat || 'filepath';
  const defaultColor = stored.defaultColor || '#EF4444'; // Red default

  subfolderInput.value = subfolder;
  copyFormatSelect.value = copyFormat;

  colorDots.forEach(dot => {
    if (dot.dataset.color.toLowerCase() === defaultColor.toLowerCase()) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }

    dot.addEventListener('click', async () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      await chrome.storage.local.set({ defaultColor: dot.dataset.color });
    });
  });

  // Settings change listeners
  subfolderInput.addEventListener('change', async () => {
    const val = subfolderInput.value.trim().replace(/^\/+|\/+$/g, '') || 'screenshot-tuif';
    subfolderInput.value = val;
    await chrome.storage.local.set({ subfolder: val });
  });

  copyFormatSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ copyFormat: copyFormatSelect.value });
  });

  // Action listeners
  btnCaptureVisible.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE' });
    window.close();
  });

  btnCaptureArea.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'START_AREA_CAPTURE' });
    window.close();
  });

  // Load recent captures if any
  const recents = stored.recent_captures || [];
  if (recents.length > 0) {
    recentContainer.style.display = 'block';
    recentList.innerHTML = '';
    recents.slice(0, 5).forEach(item => {
      const row = document.createElement('div');
      row.className = 'recent-item';
      
      const name = document.createElement('span');
      name.className = 'recent-name';
      name.title = item.path;
      name.textContent = item.path.split('/').pop() || item.path;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'recent-copy-btn';
      copyBtn.textContent = 'Copy Path';
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(item.path);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Path'; }, 1500);
      });

      row.appendChild(name);
      row.appendChild(copyBtn);
      recentList.appendChild(row);
    });
  }
});
