# Screenshot TUIF (Terminal-UI-Friendly) — `component-select` branch

**Screenshot TUIF** is a minimalist in-page screenshot and annotation tool designed for developers, UI designers, and terminal power users.

Standard screenshot utilities only copy image bitmaps to your clipboard—which cannot be pasted into terminal applications like **Antigravity CLI**, Neovim, tmux, or SSH sessions.

Screenshot TUIF bridges this gap:
1. **Click the extension icon** (or press `Alt+Shift+S`) to **instantly turn on** the in-page overlay directly over the current page (no popup, no new tab).
2. **Two Annotation Modes**:
   - ✏️ **Draw Mode (`D`)**: Manually draw freehand annotations with the red pen.
   - ⬚ **Select Component Mode (`S`)**: Hover over visible elements on the webpage to inspect them, and **click to create red outline boxes** around components. Supports multi-selection!
3. **Dual Copy Options**:
   - **`Ctrl+C` (Image Path Copy)**: Saves the annotated screenshot to an ephemeral directory (`screenshot-tuif/ephemeral/`) and copies the absolute image path to your clipboard. Auto-cleans previous ephemeral files.
   - **`Ctrl+Shift+C` (Component Code Block Copy)**: Captures the screenshot AND extracts the exact HTML/JSX component markup of the selected elements into a clean markdown code block! You can now mention the exact component you want modified!
4. **`Ctrl+S` (Permanent Download)**: Saves permanently to your Downloads folder and copies the permanent path to your clipboard.

---

## 🎨 In-Page UI & Controls

- 🔴 **Red Dashed Screen Frame**: Outlines the active viewport.
- ✕ **Top-Right Close Button (`Escape`)**: Closes the overlay and returns to the webpage.
- 💊 **Bottom-Center Floating Pill Toolbar**:
  - **Draw Button (`D`)**: Freehand red pen mode.
  - **Select Component Button (`S`)**: Snaps outline to DOM elements on hover, displaying their tag/size, and locks crisp red boxes upon click. Multiple components can be selected.
  - **Undo (↶) (`Ctrl+Z`)**: Revert the last drawn stroke or component box.
  - **Redo (↷) (`Ctrl+Y`)**: Restore reverted strokes or boxes.
  - **Copy Image Path (📋) (`Ctrl+C`)**: Copies screenshot image path.
  - **Copy Component Code (💻) (`Ctrl+Shift+C`)**: Copies screenshot path + exact HTML component code block!
  - **Download (📥) (`Ctrl+S`)**: Permanent save + path copy for terminal.

---

## ⌨️ Keyboard Shortcuts Cheat Sheet

| Shortcut | Action | What gets copied to clipboard |
|---|---|---|
| `Alt+Shift+S` | Turn on in-page annotator | — |
| `D` | Switch to **Draw** mode | — |
| `S` | Switch to **Component Select** mode | — |
| `Ctrl+C` | **Copy Screenshot Path** | `/home/.../screenshot.png` |
| `Ctrl+Shift+C` | **Copy Component Code Block** | `/home/.../screenshot.png` + ` ```html <component>...``` ` |
| `Ctrl+S` | Permanent save to Downloads | `/home/.../screenshot.png` |
| `Ctrl+Z` | Undo last stroke or component box | — |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo stroke or component box | — |
| `Escape` | Dismiss annotator | — |

---

## 🔄 How to Test

1. Open `chrome://extensions`.
2. Click the **Reload (↻)** icon on **Screenshot TUIF**.
3. Open any webpage and click the toolbar icon.
4. Press `S`, click one or more components on the page.
5. Press `Ctrl+Shift+C` (or click `[ 💻 ]`).
6. Paste into terminal or Antigravity CLI to see the screenshot path and exact component code block!
