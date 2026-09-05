/**
 * Screenshot TUIF - Service Worker (Manifest V3)
 * Handles instant in-page capture on icon click and terminal path resolution.
 */

// Trigger immediately on extension action icon click
chrome.action.onClicked.addListener(async (tab) => {
  await activateInPageOverlay(tab);
});

// Trigger on keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture_visible') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await activateInPageOverlay(activeTab);
    }
  }
});

/**
 * Capture visible tab and inject overlay directly on current page
 */
async function activateInPageOverlay(tab) {
  if (!tab || !tab.id) return;

  // Guard against restricted URLs (chrome://, webstore)
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chromewebstore.google.com') || tab.url.startsWith('chrome-extension://'))) {
    console.warn('Cannot inject into browser system page:', tab.url);
    return;
  }

  try {
    // 1. Capture current tab view
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    // 2. Inject CSS and JS
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content/tuif-overlay.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/tuif-overlay.js']
    });

    // 3. Send captured screenshot to content script
    await chrome.tabs.sendMessage(tab.id, {
      type: 'ACTIVATE_TUIF_OVERLAY',
      dataUrl: dataUrl
    });
  } catch (error) {
    console.error('Failed to activate TUIF overlay:', error);
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'SAVE_AND_GET_PATH') {
        const dataUrl = message.dataUrl;
        const stored = await chrome.storage.local.get(['subfolder', 'copyFormat']);
        const subfolder = stored.subfolder || 'screenshot-tuif';
        const copyFormat = stored.copyFormat || 'filepath';

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const filename = `${subfolder}/screenshot_${dateStr}.png`;

        const downloadId = await chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify'
        });

        const absolutePath = await waitForDownloadComplete(downloadId);

        let formattedPath = absolutePath;
        if (copyFormat === 'directory') {
          const idx = absolutePath.lastIndexOf('/');
          formattedPath = idx !== -1 ? absolutePath.slice(0, idx) : absolutePath;
        } else if (copyFormat === 'markdown') {
          formattedPath = `![screenshot](${absolutePath})`;
        } else if (copyFormat === 'quoted') {
          formattedPath = `"${absolutePath}"`;
        }

        // Save in recent captures
        await saveRecentCapture(absolutePath);

        sendResponse({ success: true, path: formattedPath, rawPath: absolutePath });
      } else if (message.type === 'DOWNLOAD_IMAGE') {
        const dataUrl = message.dataUrl;
        const stored = await chrome.storage.local.get(['subfolder']);
        const subfolder = stored.subfolder || 'screenshot-tuif';

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const filename = `${subfolder}/screenshot_${dateStr}.png`;

        await chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify'
        });

        sendResponse({ success: true, filename });
      }
    } catch (err) {
      console.error('Error handling background task:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // Keep channel open for async response
});

/**
 * Wait for chrome.downloads to complete and return absolute disk path
 */
function waitForDownloadComplete(downloadId) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timer = setTimeout(async () => {
      if (resolved) return;
      chrome.downloads.onChanged.removeListener(changeListener);
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
