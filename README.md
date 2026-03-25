# Pixy Studio

### The pixel art editor that works everywhere.
> **Vanilla JS. No frameworks. Runs in your browser on any device.**

---

# [pixystudio.app](https://pixystudio.app)

<img width="1512" height="861" alt="Pixy Studio" src="https://github.com/user-attachments/assets/368d18c8-dfb7-48c7-9338-933c25aeb80a" />

---

## Why I Built This

I'm a student who wanted to draw pixel art on my iPad.

Every app I found was either paywalled behind a monthly subscription or free and riddled with ads. I wanted something clean, fast, and honest — so I built it myself.

Pixy Studio is the result of many sleepless nights. It's designed to be the tool I actually wanted to use.

---

## Free vs Pro

Pixy is free to use. No ads, no nonsense. A one-time or monthly Pro upgrade unlocks the full toolkit for people who want to go deeper.

| Feature | Free | Pro |
|---|---|---|
| Drawing tools (pen, eraser, fill) | Yes | Yes |
| Layers (up to 3) | Yes | Yes |
| Pre-built themes | Yes | Yes |
| Standard grid sizes (8, 16, 32, 64) | Yes | Yes |
| PNG export | Yes | Yes |
| Unlimited layers | — | Yes |
| Custom themes | — | Yes |
| Any grid size | — | Yes |

Pro is a one-time purchase or monthly subscription via [LemonSqueezy](https://pixystudio.lemonsqueezy.com). No recurring billing on the lifetime plan. Cancel monthly anytime.

---

## Features

### Drawing Modes
Two modes, switchable at any time:
- **Instant Mode** — pixels appear immediately. Classic, fast, precise.
- **Progressive Mode** — strokes render with flow. More tactile, better for detailed line work.

### Layer System
- Add, delete, merge, reorder, toggle visibility
- Each layer is a separate off-screen canvas — no performance penalty

### Tools
- **Pen** — pressure sensitive on Apple Pencil
- **Eraser** — hard edge
- **Bucket Fill** — flood fill algorithm

### Themes
Curated built-in themes. Pro users can create and save fully custom themes.

### Saving & Export
- Auto-saves to IndexedDB in the browser
- Export as PNG with transparent background (ready for Unity, Godot, etc.)
- Save named snapshots to your gallery

### Works Everywhere
- **iPad** — Apple Pencil pressure, palm rejection, pinch-to-zoom
- **Desktop** — keyboard shortcuts (Ctrl+Z, B, E, etc.), precision cursor
- **Mobile** — touch-optimized UI

---

## Tech Stack

A challenge to myself: build a complex creative tool with zero frameworks.

- **Core:** HTML5 Canvas API (2D Context)
- **Logic:** Vanilla JavaScript
- **Styling:** CSS3 (Variables, Flexbox)
- **Backend:** Cloudflare Pages Functions
- **Auth & DB:** Supabase
- **Payments:** LemonSqueezy
- **Deploy:** Cloudflare Pages

---

## Try It

No install needed. Open in your browser:

**[pixystudio.app](https://pixystudio.app)**

---

## Contributing

Find a bug or have an idea? Open an issue.
