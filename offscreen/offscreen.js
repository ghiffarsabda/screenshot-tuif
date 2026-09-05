chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OFFSCREEN_CLIPBOARD_WRITE') {
    (async () => {
      const text = message.text || '';
      try {
        await navigator.clipboard.writeText(text);
        sendResponse({ success: true });
      } catch (err) {
        try {
          const textarea = document.getElementById('clipboard-textarea');
          textarea.value = text;
          textarea.focus();
          textarea.select();
          const ok = document.execCommand('copy');
          sendResponse({ success: ok });
        } catch (fallbackErr) {
          console.error('All offscreen copy methods failed:', fallbackErr);
          sendResponse({ success: false, error: fallbackErr.message });
        }
      }
    })();
    return true;
  }
});
