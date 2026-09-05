chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.target === 'tuif-offscreen-clipboard') {
    const text = message.text || '';
    let success = false;

    // Method 1: document.execCommand('copy') on textarea (standard for MV3 offscreen)
    try {
      const textarea = document.getElementById('clipboard-textarea');
      if (textarea) {
        textarea.value = text;
        textarea.select();
        success = document.execCommand('copy');
      }
    } catch (err) {
      console.warn('execCommand failed in offscreen:', err);
    }

    // Method 2: navigator.clipboard fallback
    if (!success && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    sendResponse({ success });
    return true;
  }
});
