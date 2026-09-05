# Screenshot TUIF (Terminal-UI-Friendly)

**Screenshot TUIF** is a minimalist, instant in-page screenshot and annotation tool designed for developers and terminal power users.

Standard screenshot utilities only copy image bitmaps to your clipboard—which cannot be pasted into terminal applications like **Antigravity CLI**, Neovim, tmux, or SSH sessions.

Screenshot TUIF solves this:
1. **Click the extension icon** (or press `Alt+Shift+S`) to **instantly turn on** the in-page overlay directly over the current page (no popup, no new tab).
2. **Annotate** with the vibrant **red pen** (`#EF4444`) by default.
3. Click **Copy** (or press `Ctrl+C`): it saves the screenshot to disk and copies the **absolute file path** (e.g. `/home/user/Downloads/screenshot-tuif/screenshot_2026-09-05_23-12-12.png`) directly to your clipboard!
4. **Paste** the path straight into your terminal or Antigravity CLI prompt!

---

## 🎨 Minimalist In-Page UI

The interface matches your exact terminal workflow:
- 🔴 **Red Dashed Screen Frame**: Outlines the active capture area around the entire screen.
- ✕ **Top-Right Close Button**: Quick exit button to dismiss the overlay and resume browsing.
- 💊 **Bottom-Center Floating Pill Toolbar**:
  - **Undo (↶)** (`Ctrl+Z`): Undo annotation strokes.
  - **Redo (↷)** (`Ctrl+Y`): Redo annotation strokes.
  - **Copy (📋)** (`Ctrl+C`): **Saves to an ephemeral directory (`screenshot-tuif/ephemeral/`) and copies path**. Automatically cleans up previous copied screenshots when a new one is taken so your disk stays tidy.
  - **Download (📥)** (`Ctrl+S`): **Saves permanently** to your main download directory (`screenshot-tuif/`) and **still copies the path to your clipboard** for terminal paste.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Where |
|---|---|---|
| `Alt+Shift+S` | Turn on in-page screenshot annotator | Anywhere in Chrome |
| `Ctrl+C` | **Save screenshot & Copy absolute path for terminal** | While annotating |
| `Ctrl+S` | Save screenshot to Downloads | While annotating |
| `Ctrl+Z` | Undo last stroke | While annotating |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo stroke | While annotating |
| `Escape` | Close annotator and return to page | While annotating |

---

## 🚀 How to Reload / Test in Chrome

1. Go to `chrome://extensions`.
2. Find **Screenshot TUIF**.
3. Click the **Reload (↻)** button.
4. Go to any webpage, click the **Screenshot TUIF** icon in your toolbar, and the in-page annotator will activate immediately!
