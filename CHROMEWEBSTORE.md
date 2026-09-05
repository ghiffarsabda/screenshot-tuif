# Chrome Web Store Listing — Screenshot TUIF

> Last Updated: 2026-09-05

## Store Listing

**Extension Name**
Screenshot TUIF - Terminal Friendly Capture

**Short Description**
Capture screenshots, annotate with red pen, shapes & text, and copy local file path directly for terminal & TUI apps.

**Detailed Description**
Screenshot TUIF ("Terminal UI Friendly") is a fast, keyboard-driven screenshot and annotation tool designed specifically for developers, command-line users, and terminal UI enthusiasts.

Standard screenshot utilities only copy image bitmaps to your clipboard—leaving you unable to paste screenshots into terminal applications like Antigravity CLI, tmux, Vim, or remote SSH sessions. Screenshot TUIF solves this by saving your annotated screenshot directly to your local downloads directory and instantly copying the absolute filesystem path to your clipboard.

Key Features:
- Instant Tab & Area Capture: Capture the active browser tab or drag-select an area on any web page.
- Rich In-Browser Annotation Suite: High-performance canvas editor with Pen, Arrow, Rectangle, Circle, Text, Highlighter, Blur/Obscure, and Crop tools.
- Terminal-Friendly Local Path: One-click "Copy Path (TUIF)" or Ctrl+C downloads the annotated screenshot and copies the full local path (e.g. /home/user/Downloads/screenshot-tuif/screenshot_....png).
- Red Default Annotation: Comes preconfigured with a bright red pen (#EF4444) for immediate markup, plus a custom color palette and adjustable stroke thicknesses.
- Sensitive Data Obfuscation: Built-in blur/pixelate tool to mask API keys, tokens, and personal details before sharing.
- Dual Export Modes: Copy raw image data for web apps, download standalone PNG files, or copy local paths formatted as raw filepaths, folder directories, markdown links, or shell-quoted strings.

How to Use:
1. Click the Screenshot TUIF toolbar icon or press Alt+Shift+S (full tab) / Alt+Shift+A (area select).
2. Draw your annotations using the red pen, draw boxes, arrows, or type text labels.
3. Click "Copy Path (TUIF)" or press Ctrl+C.
4. Switch to your terminal or Antigravity CLI and paste (Ctrl+Shift+V). The absolute file path is pasted directly into your command line!

Privacy and Permissions:
Screenshot TUIF runs 100% locally in your browser. All screenshots, annotations, and files remain on your device and are never transmitted to external servers.

**Category**
Developer Tools

**Single Purpose**
Capture webpage screenshots, add annotations, and copy the saved local file path for use in terminal and command-line interfaces.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Captures the visible content of the currently active browser tab when the user triggers the screenshot action. |
| `tabs` | permissions | Reads the active tab title and window ID to focus windows and open the annotation editor tab. |
| `downloads` | permissions | Saves the annotated screenshot PNG to disk in the user's downloads directory and retrieves the absolute local path for terminal pasting. |
| `storage` | permissions | Persists user preferences (custom subfolder name, terminal path format, default annotation color) across sessions. |
| `unlimitedStorage` | permissions | Prevents quota errors when saving high-resolution captures in local storage before opening the editor. |
| `scripting` | permissions | Injects the drag-to-select region overlay into the active webpage when the user selects 'Capture Area'. |
| `clipboardWrite` | permissions | Writes the saved local file path or image blob directly to the user's clipboard upon clicking copy. |

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No

The extension processes all screenshot images, drawing operations, and file operations entirely locally on the user's machine. No personal data, browsing history, or images are transmitted externally.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**: Hosted alongside the repository documentation.

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name**: Antigravity Developer
**Contact Email**: developer@example.com

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.1.0 | 2026-09-05 | Instant 1-click in-page capture overlay with red pen annotator, floating pill toolbar, and terminal path copier | Draft |
