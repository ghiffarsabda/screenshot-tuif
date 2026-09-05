/**
 * Screenshot TUIF - Service Worker (Manifest V3)
 * Handles instant in-page capture on icon click and terminal path resolution.
 * - Copy: Saves to ephemeral directory, auto-deleting previous copied screenshots.
 * - Download: Saves permanently to downloads and still copies path to clipboard.
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

  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chromewebstore.google.com') || tab.url.startsWith('chrome-extension://'))) {
    console.warn('Cannot inject into browser system page:', tab.url);
    return;
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content/tuif-overlay.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/tuif-overlay.js']
    });

    await chrome.tabs.sendMessage(tab.id, {
      type: 'ACTIVATE_TUIF_OVERLAY',
      dataUrl: dataUrl
    });
  } catch (error) {
    console.error('Failed to activate TUIF overlay:', error);
  }
}

// Clean up previous ephemeral files
async function cleanupPreviousEphemeral() {
  const { ephemeral_download_ids = [] } = await chrome.storage.local.get('ephemeral_download_ids');
  if (Array.isArray(ephemeral_download_ids) && ephemeral_download_ids.length > 0) {
    for (const id of ephemeral_download_ids) {
      try {
        await chrome.downloads.removeFile(id);
        await chrome.downloads.erase({ id });
      } catch (e) {
        // File may have already been moved or deleted
        console.warn('Could not remove previous ephemeral download:', id, e);
      }
    }
    await chrome.storage.local.set({ ephemeral_download_ids: [] });
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      
      const stored = await chrome.storage.local.get(['subfolder', 'copyFormat']);
      const subfolder = stored.subfolder || 'screenshot-tuif';
      const copyFormat = stored.copyFormat || 'filepath';

      if (message.type === 'COPY_EPHEMERAL') {
        // 1. Delete previous ephemeral screenshot(s) from disk
        await cleanupPreviousEphemeral();

        // 2. Save new ephemeral screenshot to ephemeral subfolder
        const filename = `${subfolder}/ephemeral/screenshot_${dateStr}.png`;
        const downloadId = await chrome.downloads.download({
          url: message.dataUrl,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify'
        });

        // 3. Track this new download id as ephemeral
        await chrome.storage.local.set({ ephemeral_download_ids: [downloadId] });

        // 4. Await download completion to get absolute filesystem path
        const absolutePath = await waitForDownloadComplete(downloadId);
        const formattedPath = formatPath(absolutePath, copyFormat);

        await saveRecentCapture(absolutePath);
        sendResponse({ success: true, path: formattedPath, rawPath: absolutePath, isEphemeral: true });

      } else if (message.type === 'DOWNLOAD_PERMANENT') {
        // Save permanently to main download folder (not tracked in ephemeral list)
        const filename = `${subfolder}/screenshot_${dateStr}.png`;
        const downloadId = await chrome.downloads.download({
          url: message.dataUrl,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify'
        });

        // Await download completion and also retrieve path so user can paste it!
        const absolutePath = await waitForDownloadComplete(downloadId);
        const formattedPath = formatPath(absolutePath, copyFormat);

        await saveRecentCapture(absolutePath);
        sendResponse({ success: true, path: formattedPath, rawPath: absolutePath, isPermanent: true });
      }
    } catch (err) {
      console.error('Error handling background task:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});

function formatPath(path, format) {
  if (format === 'directory') {
    const idx = path.lastIndexOf('/');
    return idx !== -1 ? path.slice(0, idx) : path;
  } else if (format === 'markdown') {
    return `![screenshot](${path})`;
  } else if (format === 'quoted') {
    return `\"${path}\"`;
  }
  return path;
}

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
