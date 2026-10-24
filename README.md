# Lico's Archive

A tiny static site for your own games. No backend, no database, no account. One file (`games.json`) controls everything on the shelf.

```
lico-archive/
├─ index.html        the site itself (you rarely touch this)
├─ games.json        your list of games  ← edit this
├─ games/<slug>/     one folder per browser game (must contain index.html)
├─ downloads/        zips, exes, apks, whatever people should download
└─ img/             Dave's pictures
```

## Try it locally

Browsers block `games.json` if you double-click `index.html`. Run a tiny server instead:

```
cd lico-archive
python -m http.server
```

Then open http://localhost:8000.

## Add a game

1. Put the build in `games/my-game/` (it needs an `index.html` inside).
2. If there's a download, drop it in `downloads/`.
3. Add an entry to the `games` array in `games.json`:

```json
{
  "slug": "my-game",
  "title": "My Game",
  "date": "2026-11-02",
  "status": "prototype",
  "engine": "Godot 4",
  "tags": ["platformer"],
  "question": "What makes a jump feel good?",
  "learned": "Coyote time and jump buffering matter more than jump height.",
  "description": "One line about what it is.",
  "controls": "Arrows to move, Z to jump.",
  "play": "games/my-game/index.html",
  "aspect": "16/9",
  "thumb": "games/my-game/thumb.png",
  "downloads": [
    { "label": "Windows (.zip)", "file": "downloads/my-game-win.zip", "size": "48 MB" },
    { "label": "Linux build", "url": "https://github.com/you/repo/releases/download/v1/my-game-linux.zip", "size": "52 MB" }
  ]
}
```

Field notes:

- `slug`: letters, numbers and dashes only. It's also the share link: `yoursite/#my-game`.
- `status`: `done`, `prototype` or `parked`. Parked means "learned what I came for".
- `play`: leave empty (`""`) for download-only games.
- `thumb`: optional. Without it the site draws a pixel sprite from the slug.
- `downloads`: use `file` for things in your repo, `url` for files hosted elsewhere.
- Delete the three `"example": true` entries once you have your own.

## Engine exports

- **Unity WebGL**: in Player Settings → Publishing Settings, set Compression Format to **Disabled**, or turn on **Decompression Fallback**. Free static hosts like GitHub Pages don't send the headers Unity's compressed builds expect, and you'll get a blank screen.
- **Godot 4 Web**: needs SharedArrayBuffer unless you export with threads off. Turn off **Thread Support** in the Web export preset so it runs on plain static hosting.
- **Plain JS / Phaser / PICO-8 / anything else**: drop the export folder in and point `play` at its `index.html`.

## Put it online (free)

**GitHub Pages** (easiest if you already use Git)

1. Make a repo, push the contents of `lico-archive/` to it.
2. Repo → Settings → Pages → Source: deploy from branch → `main`, folder `/ (root)`.
3. Your site is at `https://<username>.github.io/<repo>/`.

Limits: single files over 100 MB are rejected. Put big builds in **GitHub Releases** and use a `url` download instead.

**Netlify Drop / Cloudflare Pages** also work. Drag the `lico-archive` folder in and you're done.

## Change the look

Colors and fonts live at the top of `index.html` in the `:root` block. `--desk` is the starry background, `--navy` and `--blue` are the title bar greens, `--silver` is the window gray. It only uses fonts already on people's computers (Verdana, Tahoma, Arial Black), like sites did back then.

## Dave

Dave's pictures are `img/dave-half.webp` (bottom of the page) and `img/dave-face.webp` (the hexagon in the header). His lines are in `index.html`: search for `DAVE_LINES` to add or change what he says, and `DAVE_MILESTONES` for the special lines after 10, 25, 50 and 100 pokes.
