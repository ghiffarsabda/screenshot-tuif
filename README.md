# Screenshot TUIF (Terminal-UI-Friendly)

**Screenshot TUIF** is a Chrome extension built for developers, hackers, and terminal power users. 

Most terminal applications and TUI interfaces (such as **Antigravity CLI**, Neovim, tmux, or SSH sessions) do not support pasting raw image bitmaps directly into text prompts. Instead, they require a **filesystem path** to inspect or process an image.

Screenshot TUIF bridges this gap:
1. **Capture** the screen or a custom area.
2. **Annotate** with a vibrant red pen (default), arrows, rectangles, blur tools, or text labels.
3. **Copy (Ctrl+C)** automatically saves the image to disk and copies the **absolute file path** (e.g. `/home/user/Downloads/screenshot-tuif/screenshot_2026-09-05_231500.png`) straight to your clipboard!
4. **Paste** directly into your terminal or Antigravity CLI prompt!

---

## ⚡ Key Features

- 🎯 **Red Default Annotator**: Default drawing color is bright red (`#EF4444`) with instant pen, arrow, rectangle, circle, and text tools.
- 💻 **TUI-Friendly Copy**: One click on **Copy Path (TUIF)** or pressing `Ctrl+C` downloads the PNG locally and places the absolute disk path on your clipboard.
- 🔲 **Area Selection & Full Tab**: Capture the visible browser tab or drag-select an exact region of any webpage.
- 🔒 **Blur / Obscure Tool**: Pixelate sensitive information (passwords, tokens, API keys) before sharing.
- ✂️ **Canvas Crop**: Easily re-crop and resize the screenshot anytime inside the editor.
- 🎨 **Format Customization**:
  - `Full File Path` (default): `/home/user/Downloads/screenshot-tuif/screenshot.png`
  - `Folder Directory`: `/home/user/Downloads/screenshot-tuif`
  - `Markdown Link`: `![screenshot](/home/user/Downloads/screenshot-tuif/screenshot.png)`
  - `Quoted Path`: `"/home/user/Downloads/screenshot-tuif/screenshot.png"`
- 📋 **Dual Export**: Also includes **Copy Image** (for Slack/Discord) and **Save File** (`Ctrl+S`).

---

## 🚀 Installation Guide

1. Open Google Chrome (or any Chromium browser like Brave, Edge, Arc).
2. Navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the directory where this repository is located:
   ```
   /home/ghiffar-sabda/screenshot-tuif
   ```
6. The **Screenshot TUIF** icon will appear in your Chrome toolbar. Pin it for quick access!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Where |
|---|---|---|
| `Alt+Shift+S` | Capture visible browser tab and open editor | Anywhere in Chrome |
| `Alt+Shift+A` | Start area drag-selection overlay | Active webpage |
| `Enter` | Confirm area selection | In selection overlay |
| `Escape` | Cancel area selection | In selection overlay |
| `Ctrl+C` | **Save screenshot & Copy absolute file path** | In Editor |
| `Ctrl+S` | Save screenshot file to disk | In Editor |
| `Ctrl+Z` | Undo annotation | In Editor |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo annotation | In Editor |
| `P` | Switch to Pen (Freehand) tool | In Editor |
| `A` | Switch to Arrow tool | In Editor |
| `R` | Switch to Rectangle tool | In Editor |
| `C` | Switch to Circle tool | In Editor |
| `T` | Switch to Text tool | In Editor |
| `H` | Switch to Highlighter tool | In Editor |
| `B` | Switch to Blur tool | In Editor |
| `X` | Switch to Crop tool | In Editor |
| `+` / `-` / `0` | Zoom In / Zoom Out / Reset Zoom (1:1) | In Editor |

*(You can also customize the global shortcuts anytime at `chrome://extensions/shortcuts`)*.

---

## 🛠️ Antigravity CLI Workflow

1. You notice a visual bug or have a question about something on a website.
2. Press `Alt+Shift+S` or click the extension icon to capture.
3. Draw a red circle or arrow around the issue, or add a quick note.
4. Click **Copy Path (TUIF)** (or hit `Ctrl+C`).
5. Open your Antigravity CLI terminal and type:
   ```bash
   agy "Inspect this screenshot and fix the button alignment: /home/user/Downloads/screenshot-tuif/screenshot_2026-09-05_231500.png"
   ```
6. The AI assistant can immediately read and analyze the image directly from your local filesystem!

---

## 📂 Project Structure

```
screenshot-tuif/
├── manifest.json              # Manifest V3 configuration
├── background/
│   └── service-worker.js      # Capture dispatcher & commands
├── content/
│   ├── selection-overlay.js   # Drag-to-select region overlay
│   └── selection-overlay.css  # Selection overlay styles
├── editor/
│   ├── editor.html            # Annotation workspace
│   ├── editor.css             # Dark modern UI styles
│   └── editor.js              # Canvas drawing engine & path copier
├── popup/
│   ├── popup.html             # Quick capture popup & settings
│   ├── popup.css              # Popup styles
│   └── popup.js               # Popup interactions & recent history
├── icons/
│   ├── icon-16.png            # 16x16 icon
│   ├── icon-48.png            # 48x48 icon
│   └── icon-128.png           # 128x128 icon
├── CHROMEWEBSTORE.md          # Chrome Web Store metadata & justification
└── README.md                  # This documentation
```

---

## 🔒 Privacy

Screenshot TUIF executes 100% locally on your computer. No analytics, tracking, or network requests are made.
