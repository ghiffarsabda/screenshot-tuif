/**
 * Screenshot TUIF - Service Worker (Manifest V3)
 * Handles capture commands, tab messaging, and launching the editor.
 */

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) return;

    if (command === 'capture_visible') {
      await captureVisibleTab(activeTab);
    } else if (command === 'capture_area') {
      await startAreaCapture(activeTab);
    }
  } catch (err) {
    console.error('Command execution failed:', err);
  }
});

// Handle messages from popup, content scripts, and editor
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'CAPTURE_VISIBLE') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab) {
          const captureId = await captureVisibleTab(activeTab);
          sendResponse({ success: true, captureId });
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      } else if (message.type === 'START_AREA_CAPTURE') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab) {
          await startAreaCapture(activeTab);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      } else if (message.type === 'AREA_SELECTED') {
        // Active tab completed area selection
        const tab = sender.tab;
        if (tab && tab.windowId) {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
          const captureId = 'cap_' + Date.now();
          await chrome.storage.local.set({
            [captureId]: {
              dataUrl: dataUrl,
              crop: message.coords,
              pageTitle: tab.title || 'Screenshot',
              pageUrl: tab.url || '',
              createdAt: Date.now()
            },
            latest_capture_id: captureId
          });

          await chrome.tabs.create({
            url: chrome.runtime.getURL(`editor/editor.html?id=${captureId}`)
          });
          sendResponse({ success: true, captureId });
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Keep message channel open for async response
});

/**
 * Capture full visible tab and open editor
 */
async function captureVisibleTab(tab) {
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const captureId = 'cap_' + Date.now();

  await chrome.storage.local.set({
    [captureId]: {
      dataUrl: dataUrl,
      crop: null,
      pageTitle: tab.title || 'Screenshot',
      pageUrl: tab.url || '',
      createdAt: Date.now()
    },
    latest_capture_id: captureId
  });

  await chrome.tabs.create({
    url: chrome.runtime.getURL(`editor/editor.html?id=${captureId}`)
  });

  return captureId;
}

/**
 * Injects selection overlay into the active tab
 */
async function startAreaCapture(tab) {
  if (!tab.id) return;
  // Guard against restricted URLs (chrome://, webstore, file:// without access)
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chromewebstore.google.com') || tab.url.startsWith('chrome-extension://'))) {
    // Cannot inject on chrome pages, fallback to visible capture
    await captureVisibleTab(tab);
    return;
  }

  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['content/selection-overlay.css']
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/selection-overlay.js']
  });
}
