/**
 * Screenshot TUIF - Service Worker (Manifest V3)
 * Handles in-page capture, ephemeral cleanup, permanent download, and bulletproof offscreen clipboard writes.
 */

// Trigger immediately on extension action icon click or _execute_action shortcut (Alt+Shift+S / Option+Shift+S)
chrome.action.onClicked.addListener(async (tab) => {
  await activateInPageOverlay(tab);
});

// Trigger on keyboard shortcut command (supporting _execute_action or capture_visible fallback)
chrome.commands.onCommand.addListener(async (command) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab) {
    await activateInPageOverlay(activeTab);
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
    // 1. If an existing overlay is open on the tab, close it before capturing!
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_TUIF_OVERLAY' });
      // Brief pause to allow DOM update
      await new Promise(r => setTimeout(r, 40));
    } catch (_) {
      // Tab may not have overlay injected yet
    }

    // 2. Capture clean current tab view
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    // 3. Inject CSS and JS
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content/tuif-overlay.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/tuif-overlay.js']
    });

    // 4. Send captured screenshot to content script
    await chrome.tabs.sendMessage(tab.id, {
      type: 'ACTIVATE_TUIF_OVERLAY',
      dataUrl: dataUrl
    });
  } catch (error) {
    console.error('Failed to activate TUIF overlay:', error);
  }
}

// Ensure offscreen document exists for reliable clipboard write
async function writeClipboardViaOffscreen(text) {
  if (!text) return;
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (!existingContexts || existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen/offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Reliable clipboard write for screenshot path and component code'
      });
    }

    await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_CLIPBOARD_WRITE',
      text: text
    });
  } catch (e) {
    console.warn('Offscreen clipboard writing issue:', e);
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
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}_${ms}`;
      
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

        // If message provided custom text (e.g. Component Code Block), use that for clipboard
        const textToCopy = message.customClipboardText
          ? message.customClipboardText.replace('__SCREENSHOT_PATH_PLACEHOLDER__', formattedPath)
          : formattedPath;

        // 5. Write to clipboard via offscreen document (failsafe)
        await writeClipboardViaOffscreen(textToCopy);

        await saveRecentCapture(absolutePath);
        sendResponse({ success: true, path: formattedPath, fullText: textToCopy, rawPath: absolutePath, isEphemeral: true });

      } else if (message.type === 'DOWNLOAD_PERMANENT') {
        // Save permanently to main download folder
        const filename = `${subfolder}/screenshot_${dateStr}.png`;
        const downloadId = await chrome.downloads.download({
          url: message.dataUrl,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify'
        });

        const absolutePath = await waitForDownloadComplete(downloadId);
        const formattedPath = formatPath(absolutePath, copyFormat);

        // Write to clipboard via offscreen document (failsafe)
        await writeClipboardViaOffscreen(formattedPath);

        await saveRecentCapture(absolutePath);
        sendResponse({ success: true, path: formattedPath, rawPath: absolutePath, isPermanent: true });

      } else if (message.type === 'FORCE_CLIPBOARD_WRITE') {
        await writeClipboardViaOffscreen(message.text);
        sendResponse({ success: true });
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
