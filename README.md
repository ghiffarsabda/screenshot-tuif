# Screenshot TUIF (Terminal-UI-Friendly) — `component-select` branch

**Screenshot TUIF** is a minimalist in-page screenshot and annotation tool designed for developers and terminal power users.

Standard screenshot utilities only copy image bitmaps to your clipboard—which cannot be pasted into terminal applications like **Antigravity CLI**, Neovim, tmux, or SSH sessions.

Screenshot TUIF solves this:
1. **Click the extension icon** (or press `Alt+Shift+S`) to **instantly turn on** the in-page overlay directly over the current page (no popup, no new tab).
2. **Two Annotation Modes**:
   - ✏️ **Draw Mode (`D`)**: Manually draw freehand annotations with the red pen.
   - ⬚ **Select Component Mode (`S`)**: Hover over visible elements on the webpage to inspect them, and **click to create red boxes** around components. Select as many components as you need!
3. **Copy (📋) (`Ctrl+C`)**: Saves the screenshot to an ephemeral directory and copies the **absolute path** to your clipboard for terminal paste. Automatically removes previous copied screenshots when a new one is taken.
4. **Download (📥) (`Ctrl+S`)**: Saves permanently to your Downloads folder and still copies the path to your clipboard.

---

## 🎨 In-Page UI & Controls

- 🔴 **Red Dashed Screen Frame**: Outlines the active viewport.
- ✕ **Top-Right Close Button (`Escape`)**: Closes the overlay and returns to the webpage.
- 💊 **Bottom-Center Floating Pill Toolbar**:
  - **Draw Button (`D`)**: Freehand red pen mode.
  - **Select Component Button (`S`)**: Snaps to DOM elements on hover, displaying their tag/size, and locks crisp red boxes upon click. Supports multi-selection!
  - **Undo (↶) (`Ctrl+Z`)**: Revert the last drawn stroke or component box.
  - **Redo (↷) (`Ctrl+Y`)**: Restore reverted strokes or boxes.
  - **Copy (📋) (`Ctrl+C`)**: Ephemeral save + path copy for terminal.
  - **Download (📥) (`Ctrl+S`)**: Permanent save + path copy for terminal.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+S` | Turn on in-page screenshot annotator |
| `D` | Switch to **Draw** mode (freehand red pen) |
| `S` | Switch to **Select Component** mode (hover & click to box) |
| `Ctrl+C` | Save ephemeral screenshot & copy path for terminal |
| `Ctrl+S` | Save permanent screenshot to Downloads & copy path |
| `Ctrl+Z` | Undo last stroke or component box |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo stroke or component box |
| `Escape` | Dismiss annotator and return to page |

---

## 🔄 How to Test

1. Open `chrome://extensions`.
2. Click the **Reload (↻)** icon on **Screenshot TUIF**.
3. Open any webpage and click the toolbar icon.
4. Click **Select Component** (or press `S`), hover over buttons, cards, or tables, and click to automatically box them in red!
