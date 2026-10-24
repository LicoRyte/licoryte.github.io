# Lico's Archive

My personal game shelf. Live at https://licoryte.github.io

No backend, no database, no account. One file (`games.json`) controls everything on the shelf.

```
licoryte.github.io/
├─ index.html        the site itself (you rarely touch this)
├─ games.json        the list of games  ← edit this
├─ games/<slug>/     one folder per browser game (must contain index.html)
├─ downloads/        zips, exes, apks for people to download
└─ img/              Dave's pictures
```

## One-time setup

The GitHub website can't upload files over 25 MB, and a Godot web export's `.wasm` is around 37 MB. So use **GitHub Desktop** (free, no terminal).

1. Install GitHub Desktop from https://desktop.github.com and sign in as LicoRyte.
2. File → Clone repository → pick `LicoRyte/licoryte.github.io` → Clone.
   Remember the local path (e.g. `Documents\GitHub\licoryte.github.io`).

## Add a game

### 1. Export the game into the site folder

**Godot 4**
- Project → Export → Add… → **Web**.
- Under **Variant**, turn **Thread Support OFF**. (GitHub Pages can't send the headers threaded builds need. Leaving it on gives a black screen or an error.)
- Export Path: `games/<slug>/index.html` inside your cloned folder, e.g.
  `Documents\GitHub\licoryte.github.io\games\spelighter\index.html`
- Click **Export Project**, untick "Export With Debug".
- Optional test before you go further: in the Godot editor, the "Run in browser" button (top right, next to Play) runs the web build locally. If it breaks there, it'll break on the site too.

**Unity WebGL**
- Player Settings → Publishing Settings → Compression Format: **Disabled** (or turn on Decompression Fallback).
- Build into `games/<slug>/`.

**Anything else** (plain JS, Phaser, PICO-8, GameMaker HTML5): put the export in `games/<slug>/` with its `index.html` at the top of that folder.

`<slug>` = short name, lowercase, letters/numbers/dashes only. It's also the share link: `licoryte.github.io/#<slug>`.

### 2. (Optional) Add download builds

Drop zips into `downloads/`. Single files must be under 100 MB. For bigger builds, link to itch.io or a GitHub Release instead (see `url` below).

### 3. Add the entry to games.json

Open `games.json` in VS Code or Notepad. Paste this inside the `"games": [ ]` brackets and change the values:

```json
{
  "slug": "spelighter",
  "title": "Spelighter",
  "date": "2026-10-24",
  "status": "prototype",
  "engine": "Godot 4",
  "tags": ["platformer", "pixel art"],
  "question": "what i wanted to figure out",
  "learned": "what i figured out",
  "description": "one or two lines about the game",
  "controls": "WASD to move, Space to jump",
  "play": "games/spelighter/index.html",
  "aspect": "16/9",
  "downloads": [
    { "label": "Windows (.zip)", "file": "downloads/spelighter-win.zip", "size": "59 MB" },
    { "label": "Builds on itch.io", "url": "https://licothewhat.itch.io/spelighter" }
  ]
}
```

- **More than one game:** put a comma between entries `{ ... }, { ... }`, but no comma after the last one. A wrong comma is the #1 way to break the site. Paste the file into https://jsonlint.com if unsure.
- `status`: `done`, `prototype` or `parked`.
- `play`: `""` for download-only games.
- `downloads`: `[]` for none. Use `file` for things in `downloads/`, `url` for links elsewhere.
- `question` / `learned` / `controls`: leave as `""` to hide that row.
- `thumb`: optional, e.g. `"games/spelighter/thumb.png"`. Without it the site draws a pixel sprite.
- Newest `date` shows first and gets the blinking NEW! tag.

### 4. (Optional) Test the whole site locally

Double-clicking `index.html` won't work (the browser blocks it from reading `games.json`). In the site folder, open a terminal and run:

```
py -m http.server
```

Then open http://localhost:8000. Ctrl+C to stop.

### 5. Publish

1. Open GitHub Desktop. Your changes are listed on the left.
2. Type a summary at the bottom left (e.g. "add spelighter") → **Commit to main**.
3. Click **Push origin** at the top.
4. Wait 1–2 minutes, then refresh https://licoryte.github.io (Ctrl+F5).
   Progress: github.com/LicoRyte/licoryte.github.io → **Actions** tab. Green check = live.

## Remove or update a game

- **Remove:** delete its `games/<slug>/` folder and its entry in `games.json` → commit → push.
- **Update:** export over the same folder → commit → push.

## If it breaks

- **"Couldn't load games.json"** on the site: a typo in `games.json`. Check commas and quotes.
- **Black screen / "SharedArrayBuffer" or "Cross-Origin Isolation" error** in a Godot game: Thread Support is still on. Turn it off and re-export.
- **Blank Unity game**: compression is on. Set it to Disabled.
- **Push rejected for a big file**: a file is over 100 MB. Move it out and link it with `url` instead.
- **Changes don't show**: wait 2 minutes, then Ctrl+F5.

## Change the look

Colors and fonts are at the top of `index.html` in the `:root` block. `--desk` is the starry background, `--navy` and `--blue` are the title bar greens, `--silver` is the window gray.

## Dave

`img/dave-half.webp` (bottom of the page) and `img/dave-face.webp` (header hexagon). His lines are in `index.html`: search for `DAVE_LINES`, and `DAVE_MILESTONES` for the special lines after 10, 25, 50 and 100 pokes.
