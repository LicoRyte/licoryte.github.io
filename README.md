# Lico's Awesome Archive

My personal corner of the interest. Live at https://licoryte.github.io

No backend, no database, no account. Everything is edited right on github.com — no app or terminal needed.

```
licoryte.github.io/
├─ index.html        the site itself (you rarely touch this)
├─ games.json        site text, links and the list of games  ← edit this
├─ img/covers/       cover images for the game cards
├─ img/gallery/      gallery pictures (just drop images here)
├─ img/background/   background image (keep one here)
├─ img/icons/       desktop and window icons (SerenityOS, BSD license)
├─ img/clancies/     Clancies sprite sheets
├─ img/friends/      other desktop buddies
├─ img/              Dave's pictures
└─ fonts/            VT323 (counter) and Comic Neue (Dave's bubble) — free, OFL
```

Changes go live 1–2 minutes after you commit. Refresh with Ctrl+F5. Progress: the **Actions** tab on GitHub (green check = live).

## Add a game

Each game is a card on the shelf: cover image, title, description, platform, genre, and a button that opens the game's page (itch.io, Newgrounds, your own site, anything).

**1. Upload the cover image** (optional, but it looks better)
- Open https://github.com/LicoRyte/licoryte.github.io/tree/main/img/covers
- **Add file → Upload files**, drag the image in, **Commit changes**.
- Any size works; it's cropped to 4:3 (like 800×600). Your itch.io cover image is perfect.
- No cover? The card gets a random pixel sprite instead.

**2. Add the entry**
- Open https://github.com/LicoRyte/licoryte.github.io/blob/main/games.json and click the ✏️ pencil (Edit).
- Inside `"games": [ ... ]`, add a block like this:

```json
{
  "title": "Spelighter",
  "url": "https://licothewhat.itch.io/spelighter",
  "image": "img/covers/spelighter.png",
  "description": "one or two lines about the game",
  "platform": "Windows, Linux",
  "genre": "Platformer"
}
```

- **Commit changes**.

Field notes:
- Only `title` and `url` are really needed. Leave out `platform` or `genre` and that row just disappears.
- `image`: must match the file name you uploaded exactly (capital letters count).
- Order on the shelf = order in the list. Put new games at the top.
- **Commas:** a comma between blocks `{ ... }, { ... }`, none after the last one. A wrong comma is the #1 way to break the site. If unsure, paste the file into https://jsonlint.com before committing.

## Remove or edit a game

Edit `games.json` on github.com (pencil icon), delete or change the block, commit. To delete a cover: open it in `img/covers/` → **⋯ → Delete file**.

## Add a picture to the gallery (easy way, no app needed)

Just put an image in `img/gallery/`. The site finds it by itself. No `games.json` edit needed.

On github.com:
1. Open https://github.com/LicoRyte/licoryte.github.io/tree/main/img/gallery
2. **Add file → Upload files**, drag your images in (each under 25 MB; jpg, png, gif, webp).
3. **Commit changes**. Wait 1–2 minutes, refresh the site.

Or with GitHub Desktop: copy the image into `img/gallery/` → commit → push.

- The title comes from the file name: `my-cool_drawing.png` shows as "my cool drawing".
- Order is by file name. Start names with numbers (`01-...`, `02-...`) to control it.
- To delete a picture: open it on github.com → **⋯ → Delete file** → commit.
- Optional: to give a picture a nicer title, a caption or a date, add it to the `"gallery"` list in `games.json`. Listed pictures show first, in list order:

```json
{ "file": "img/gallery/my-cool_drawing.png", "title": "Cool drawing", "note": "drawn at 2am", "date": "2026-10-24", "alt": "what the picture shows" }
```

## Change the background

Put **one** image in `img/background/` and delete the old one (`forest.webp`). On github.com: open https://github.com/LicoRyte/licoryte.github.io/tree/main/img/background → upload the new image → then open `forest.webp` → **⋯ → Delete file**.

- If there are several images in that folder, the first one by file name wins.
- Tall or wide both work; it's cropped to fill the screen. Around 1400–2000 px and under ~1 MB loads fast.
- To force a specific image instead, set `"background": "img/background/whatever.jpg"` in `games.json` (inside `"site"`). Leave it `""` to use the folder.

## If it breaks

- **"Couldn't load games.json"** on the site: a typo in `games.json`. Check commas and quotes, or paste it into https://jsonlint.com.
- **Cover doesn't show:** the `image` path doesn't match the file name exactly, or the deploy isn't finished yet.
- **Changes don't show:** wait 2 minutes, then Ctrl+F5.
- **Undo a mistake:** on GitHub open **Commits**, find the last good one, and copy the old file contents back.

## Change the look

Colors and fonts are at the top of `index.html` in the `:root` block. `--navy` and `--blue` are the title bar greens, `--silver` is the window gray. Fonts are set in `--f-ui` (Tahoma, window chrome), `--f-head` (Trebuchet MS, headings), `--f-body` (Verdana, reading text), `--f-mono` (LCD counter) and `--f-comic` (Dave's bubble).

## Sparkles

- Sparkles & cursor trail: visitors can turn them off with the checkbox in the "stats" box. They start off for people who set "reduce motion" on their device.

## The desktop

The site looks like a late-90s desktop.

- **Desktop icons** (top-left) open windows: about_me.txt, My Games, Gallery, Internet (your links), Control Panel, Recycle Bin, Dave.exe. Double-click on a computer, one tap on a phone.
- **Windows** stay fixed on screen. Drag them by the title bar. `_` minimizes to the taskbar, `□` maximizes (or double-click the title bar), `×` closes. Games and Gallery scroll inside their window. On phones windows open full-screen.
- **Links straight to a window:** add the window name after `#`, e.g. https://licoryte.github.io/#games (also `#gallery`, `#about`, `#links`, `#control`).
- **Start menu:** your profile (title + tagline from `games.json`) at the top, then shortcuts. "Run..." understands: `help`, `notepad`, `explorer`, `mspaint`, `control`, `coffee`, `dave`, `clancies`, `mon`, `pancake`, `minesweeper`, `rain`, `quit`, `sudo`. Add more in `index.html` (search `const RUN`).
- **Control Panel:** game counter, sparkles on/off, and Clancies/Mon on/off.
- **Desktop buddies:** Clancies and Mon (Monochrome) walk along the taskbar. Drag and throw them; they fall and squish on the bottom of the screen. Click one for a hop.
  - Clancies: `img/clancies/` (16×16 frames in one row): `idle.png`, `walk.png`, `air.png` (held/flying), `land.png` (landing squish).
  - Mon: `img/friends/mon.png`, an RPG-style 32×32 sheet (3 walk frames per row; rows = down, left, right, up).
  - To change names, sizes, speeds or frame counts, or add another buddy: search `const BUDDIES` in `index.html`.
- **Cursors:** in `img/cursors/`. The arrow and pointing hand are Lico's own (white with a thin black outline; the plain originals are `*-original.png`). I-beam, grab, hourglass and no-entry are from SerenityOS. Swap a file to change it; hotspots are set at the top of `index.html` (search `--cur-`).
- **Icons:** from the SerenityOS icon set (free, BSD license, see `img/icons/LICENSE-serenityos.txt`). To change a window's icon, swap the file in `img/icons/` or edit the `data-icon` / `<img src>` in `index.html`.

## Dave

`img/dave-half.webp` (bottom-right of the desktop) and `img/dave-face.webp` (Start menu profile and the Dave.exe icon). His lines are in `index.html`: `DAVE_LINES` (any time), `MOODS` (lines per mood: asleep 0-6, booting up, working, lunch, afternoon slump, overtime, late, monday, friday, day off on weekends, annoyed when poked 6 times in 4 seconds) and `DAVE_MILESTONES` (after 10, 25, 50 and 100 pokes). Moods follow the visitor's own clock.
