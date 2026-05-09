# Trace Browser Memory Chrome Web Store Listing

## Extension Name

Trace Browser Memory

## Short Description

Save, search, restore, and organize browser sessions so your tabs never vanish.

## Detailed Description

Trace Browser Memory is a lightweight Chrome extension for saving browser sessions and recovering your work when tabs pile up, windows get closed, or research trails become hard to follow.

Save the current window with one click, let Trace auto-save recent sessions in the background, then search across saved tab titles, URLs, tags, and notes when you need to return to a workflow. Sessions can be renamed, tagged, pinned, copied, restored in a new window, imported, exported, or cleared when you are done.

Core features:

- Save current browser sessions
- Automatic background session saves
- Search saved tabs, URLs, tags, and summaries
- Restore a session into a new browser window
- Pin important sessions
- Tag sessions by project or category
- Rename sessions and edit summaries
- Copy all links from a saved session
- Import and export sessions as JSON
- Keep saved data local to your browser

Trace is designed for research, shopping, planning, writing, development, and any tab-heavy workflow where you want a quick way back.

## Category

Productivity

## Language

English

## Privacy Practices Summary

Trace Browser Memory stores saved tab sessions locally in Chrome storage. Saved sessions can include tab titles, URLs, favicons, timestamps, tags, pinned status, and user-edited summaries. The extension does not sell data, does not use analytics or advertising trackers, and does not transmit saved session data to an external server.

## Permissions Justification

- `tabs`: Reads the current window's tabs so Trace can save tab titles, URLs, and favicons and restore saved sessions.
- `storage`: Saves session data, settings, tags, summaries, and import/export state locally in the browser.
- `alarms`: Runs periodic auto-save checks in the background.
- `host_permissions`: Allows Trace to read tab details across sites for session saving.

## Store Assets Included

- Extension icons: `public/icons/icon-16.png`, `public/icons/icon-32.png`, `public/icons/icon-48.png`, `public/icons/icon-128.png`
- Existing screenshot: `public/screenshots/trace-popup.png`
- Store screenshot: `store-assets/screenshot-1280x800.png`
- Small promotional tile: `store-assets/promotional-tile-440x280.png`
- Optional marquee tile: `store-assets/marquee-1400x560.png`
- Privacy policy page: `docs/privacy-policy.html`
- Upload zip after build: `release/trace-browser-memory-0.1.0.zip`

## Screenshot Captions

- Save, search, tag, and restore tab sessions from a focused Chrome extension popup.

## Notes Before Submission

- Replace the privacy policy contact email in `docs/privacy-policy.html` with the publisher support email.
- Host `docs/privacy-policy.html` publicly and paste that hosted URL into the Chrome Web Store privacy policy field.
