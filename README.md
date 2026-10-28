# Not-So-Awesome Archive

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
├─ apps/             bigger apps loaded on demand (Network Man, Venture)
├─ data/             emoji list for Your Dude
├─ sfx/              startup and window-open sounds (mp3)
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
- **Pixel art:** put `pixel` in the file name (`mon-pixel.png`, `clancies_pixel.png`) and it shows sharp (no blur), uncropped, on a light background, so small sprites can be blown up big. The word `pixel` is left out of the title. Or add `"pixel": true` to its entry in `games.json`.
- To delete a picture: open it on github.com → **⋯ → Delete file** → commit.
- Optional: to give a picture a nicer title, a caption or a date, add it to the `"gallery"` list in `games.json`. Listed pictures show first, in list order:

```json
{ "file": "img/gallery/my-cool_drawing.png", "title": "Cool drawing", "note": "drawn at 2am", "date": "2026-10-24", "alt": "what the picture shows" }
```

## Change the background

The default desktop is plain classic teal with Classic blue windows. Visitors can switch in **OS > Display**. To change the defaults, search `DEFAULT_THEME` in `index.html` (`blue`, `forest`, `maroon`, `slate`) and `DEFAULT_WALL` / the `wallChoice = 'teal'` lines (`teal`, `site` = the photo, `night`).

The photo option ("Forest photo") uses the image in `img/background/`. Put **one** image in `img/background/` and delete the old one (`forest.webp`). On github.com: open https://github.com/LicoRyte/licoryte.github.io/tree/main/img/background → upload the new image → then open `forest.webp` → **⋯ → Delete file**.

- If there are several images in that folder, the first one by file name wins.
- Tall or wide both work; it's cropped to fill the screen. Around 1400–2000 px and under ~1 MB loads fast.
- To force a specific image instead, set `"background": "img/background/whatever.jpg"` in `games.json` (inside `"site"`). Leave it `""` to use the folder.

## If it breaks

- **"Couldn't load games.json"** on the site: a typo in `games.json`. Check commas and quotes, or paste it into https://jsonlint.com.
- **Cover doesn't show:** the `image` path doesn't match the file name exactly, or the deploy isn't finished yet.
- **Changes don't show:** wait 2 minutes, then Ctrl+F5.
- **Undo a mistake:** on GitHub open **Commits**, find the last good one, and copy the old file contents back.

## Change the look

Colors and fonts are at the top of `index.html` in the `:root` block. `--navy` and `--blue` are the title bar colors (the color schemes live in `const THEMES`), `--silver` is the window gray. Fonts are set in `--f-ui` (Tahoma, window chrome), `--f-head` (Trebuchet MS, headings), `--f-body` (Verdana, reading text), `--f-mono` (LCD counter) and `--f-comic` (Dave's bubble).

## Sparkles

- Sparkles & cursor trail: visitors can turn them off with the checkbox in the "stats" box. They start off for people who set "reduce motion" on their device.

## The desktop

The site looks like a late-90s desktop.

- **Log on + boot:** every visit (and every refresh) starts on a black screen with a gray profile picture and an "Enter Your Name" box. Type any name (or none, for Guest) and press Enter. A block loading bar fills up, the desktop appears with a faint white flash, and Dave greets you by name. Turning the site back on after Shut Down plays the loading bar again. Visitors can skip it with a click or Esc. The name is kept in that visitor's browser only, to fill the box next time. To change the number of blocks, search `BLOCKS` in `index.html`.
- **Desktop icons** (top-left) open windows: about_me.txt, My Games, Gallery, Texty (the browser), Gmail/Twitter/YouTube shortcuts, Workstation, Your Dude, Network Man, Venture, Paint, Sticky Notes, OS, Recycle Bin. Double-click on a computer, one tap on a phone.
- **Windows** stay fixed on screen. Drag them by the title bar. `_` minimizes to the taskbar, `□` maximizes (or double-click the title bar), `×` closes. Games and Gallery scroll inside their window. On phones windows open full-screen.
- **Links straight to a window:** add the window name after `#`, e.g. https://licoryte.github.io/#games (also `#gallery`, `#about`, `#texty`, `#workstation`, `#dude`, `#netman`, `#venture`, `#paint`, `#os`).
- **Start menu:** your profile (title + tagline from `games.json`) at the top, then shortcuts. "Run..." understands: `help`, `notepad`, `explorer`, `texty`, `workstation`, `dude`, `netman`, `ping`, `venture`, `space`, `os`, any web address, `mspaint`, `control`, `coffee`, `dave`, `clancies`, `mon`, `pancake`, `minesweeper`, `rain`, `quit`, `sudo`. Add more in `index.html` (search `const RUN`).
- **Texty:** a little browser window. Type a website in the Address bar (or words to search with Google) and press Enter; it opens in a new tab. Real sites refuse to be shown inside other pages, so new tabs are the way. Favorites come from `links` in `games.json`. The globe is from the KDE Oxygen icon set (LGPL 3, see `img/icons/LICENSE-oxygen-LGPL-3.0.txt`).
- **Website shortcuts:** Gmail, Twitter and YouTube icons on the desktop (and in the Start menu) open those sites in a new tab. Generic icons on purpose: envelope and video player from SerenityOS, the speech bubble is hand-drawn for this site. To add another, copy one of the `class="dicon shortcut"` lines in `index.html` and change the `url:` address, icon and name.
- **Workstation:** a folder of useful work websites (PDF, convert/translate, images, video/audio, design, game dev, code, everyday), grouped by category, with a Find box and an info panel. Double-click opens the site in a new tab. Edit the list in `games.json` under `"workstation"`: each category has `"tools"`, each tool has `name`, `url`, `desc` and `icon` (a name from `img/icons/ws/`, e.g. `filetype-pdf`, or a path to your own image).
- **Sounds:** `sfx/startup.mp3` plays when the boot finishes (the windows that open with it stay quiet), `sfx/notify.mp3` plays when a window opens. To change one, upload a new file with the same name into `sfx/`. Volumes are in `index.html` (search `SFX_VOL`, 0 to 1). Visitors can turn sounds off or test them in OS > Extras. Browsers block sound until the visitor clicks or types something, which the name box takes care of. If a file fails to load, a built-in two-note chime plays instead.
- **Right-click the desktop:** Arrange Icons, Refresh, New Folder, New Sticky Note, Properties (opens OS). Right-click an icon for Open / Rename / Delete (only folders visitors made can be renamed or deleted).
- **OS:** one settings window with tabs. *Display*: wallpaper (classic teal by default, the forest photo, night, or the visitor's own Paint drawing) and window color (classic blue by default, forest, maroon, slate). The window color also colors the Start menu, links and highlights. *System*: game counter, picture count, Dave poke count. *Extras*: sparkles on/off, sounds on/off (with a Test button), Clancies/Mon on/off. All saved in the visitor's browser only.
- **Venture:** a pixel planetarium. The Sun and the 8 planets sit where they really are on the date shown (calculated from NASA JPL's approximate orbital elements), plus the asteroid belt and Earth's Moon, and they keep orbiting. Time controls: Pause, 1 day/week/month/year per second, Today. Zoom with + / − or the mouse wheel. Click a planet (or the Sun) to lock on: blue brackets snap onto it with its name, distance from the Sun and speed, and the side panel shows live distances (from the Sun, from Earth, light travel time), stats, moons and fun facts (Another fact ▸). Esc or Unlock lets go. Sizes and distances are not to scale (orbits are spaced out so everything fits). It only animates while its window is open. Moon counts are 2026 numbers and keep growing; edit them in `apps/venture.js` (search `BODIES`). If you edit that file, bump `?v=` in `index.html`.
- **Network Man:** a little network simulator for learning. Add PCs, Switches, Routers and Servers, drag them around, connect them with **Cable** (click one device, then another), and click a device to set its IP address, subnet mask (`255.255.255.0` or `/24`) and default gateway. Routers get an IP per port and optional static routes (`0.0.0.0` + `0.0.0.0` = default route). Then pick a PC in **Ping from**, type a destination IP, press **Ping**, and **Step** (or **Play**) through every frame: ARP broadcasts, switches learning and flooding, routers routing, lowering TTL and rewriting MAC addresses, and the reply coming back. Each frame travels as a little pixel letter (seal color: orange = ARP, green = Echo Request, blue = Echo Reply, red = error) and stays above the device it reached. Hover the letter (tap on a phone) to see the frame's structure: the layers (Ethernet, ARP/IPv4, ICMP, FCS) with every field, and yellow on what changed since the previous hop. The status bar says where it is. The **Log** tab lists all steps (click one to move the letter back to it), and each device shows its ARP, MAC or routing table. It also shows failures: no gateway, wrong network, no route (Destination Unreachable), nobody answering ARP, routing loops (TTL runs out) and switch loops (broadcast storm). **More...** has Clear tables, Load example network and Empty workspace. The network is saved in the visitor's browser. Code: `apps/netman.js` (loads only when the window opens; if you edit it, bump `?v=1` in `index.html` so browsers fetch the new one).
- **Your Dude:** an emoji picker. Search by name or feeling (`fire`, `cry cat`, `pizza`) or browse the tabs. Click an emoji to copy it; it also collects in the box at the bottom, and **Copy** copies the whole combo (**Clear** empties it). Enter in the Find box copies the first result. The clock tab shows recently copied ones (saved in the visitor's browser). Emoji look like the visitor's system emoji (Windows, Mac and phones all look different). The list is `data/emoji.json`, built from unicode-emoji-json and emojilib (MIT, licenses in `data/`).
- **Sticky Notes:** notes on the desktop in four CMYK colors (cyan, magenta, yellow, black): click a color square in the note's top strip to switch. New notes use the last color picked; `+` copies the color of that note. Drag by the top strip, resize from the corner, `+` adds another, `×` deletes. Saved in that visitor's browser only (nobody else sees them).
- **Paint:** pencil, brush (4 sizes), eraser, fill bucket, color picker, airbrush, 28-color palette (left click = main color, right click = second color), Undo (also Ctrl+Z), New, Save as PNG (downloads `lico-paint.png`), and Set as wallpaper. Tool icons are from SerenityOS's PixelPaint.
- **Desktop buddies:** Clancies and Mon (Monochrome) walk along the taskbar. Drag and throw them; they fall and squish on the bottom of the screen. Click one for a hop.
  - Clancies: `img/clancies/` (16×16 frames in one row): `idle.png`, `walk.png`, `air.png` (held/flying), `land.png` (landing squish).
  - Mon: `img/friends/mon.png`, an RPG-style 32×32 sheet (3 walk frames per row; rows = down, left, right, up).
  - To change names, sizes, speeds or frame counts, or add another buddy: search `const BUDDIES` in `index.html`.
- **Cursor:** Lico's white arrow (`img/cursors/arrow.png`, with a thin black outline; plain original is `arrow-original.png`) is used everywhere: clicking, grabbing, text. The other cursor files are kept in `img/cursors/` in case you want one back; the switches are at the top of `index.html` (search `--cur-`).
- **Icons:** from the SerenityOS icon set (free, BSD license, see `img/icons/LICENSE-serenityos.txt`). To change a window's icon, swap the file in `img/icons/` or edit the `data-icon` / `<img src>` in `index.html`.

## Dave

`img/dave-half.webp` (bottom-right of the desktop) and `img/dave-face.webp` (Start menu profile). His lines are in `index.html`: `DAVE_LINES` (any time), `MOODS` (lines per mood: asleep 0-6, booting up, working, lunch, afternoon slump, overtime, late, monday, friday, day off on weekends, annoyed when poked 6 times in 4 seconds) and `DAVE_MILESTONES` (after 10, 25, 50 and 100 pokes). Moods follow the visitor's own clock.
