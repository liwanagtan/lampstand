# Setting up Lampstand for Sunday

A one-time checklist for the church laptop, then a short routine for each service.

## One-time setup

1. **Use Google Chrome** (latest stable) on the Windows laptop.
2. **Open Lampstand** at its address and wait for "Preparing Bibles… 5 of 5". This happens once; afterwards Lampstand works with the network unplugged.
3. **Install it as an app.** In Chrome's address bar, click the install icon (or ⋮ → _Cast, save and share_ → _Install page as app_). Lampstand gets a desktop icon and opens in its own window.
4. **Connect the TV** with HDMI and set Windows to **Extend these displays** (Win + P → _Extend_). The TV should run at 1920×1080.
5. **Turn off TV overscan.** Most TVs crop the edges of the picture. On the TV remote, open _Picture → Picture size / Aspect ratio_ and choose **Just Scan**, **Screen Fit**, **Full Pixel** or **1:1** (the name depends on the brand). Lampstand keeps all text inside a 5% safe area, but a cropped picture still looks cramped.
6. **Allow window placement.** The first time you press **Open output**, Chrome asks to _manage windows on all your displays_. Choose **Allow**, so the output opens full screen on the TV by itself.
7. **Allow pop-ups** for Lampstand if Chrome blocks the output window.
8. **Set your defaults** in _Settings_: default translation, template, verse overlay, and your church's logo for the logo screen.
9. **Export a backup** from _Settings → Data_ after big changes, and keep it on a USB drive.

## Each service

1. Before the service, open the presentation from the **Library** and click its thumbnail to present.
2. Press **Start Presentation**. The output appears full screen on the TV; the laptop keeps the control screen.
3. Start with the countdown slide. At any time press **B** to blank the TV, **L** for the logo, **S** for the sermon poster, or **F** to freeze the TV while you prepare the next thing.
4. Advance with **→ / Space / PageDown** (a presentation clicker works without setup) and go back with **← / PageUp**.
5. To show a verse the pastor mentions, press **/**, type it (for example `jn 3 16`, `ps 23 1-3 web`), and press **Enter**, or click it in the **Queue**. Press **Esc** to clear it. **1 / 2 / 3 / 4** switch between lower third, side panel, full screen and popup.
6. Press **?** for the full list of shortcuts, or **Ctrl+K** for every command.

If the output window closes, the control screen shows **Output disconnected — Reopen**. Press it and the TV comes back exactly where it was. When the service is over, press **Exit Presentation**.

## Making slides with Claude

The `skill/lampstand-slides` folder contains the Claude skill (`SKILL.md`, `schema.json` and an example). Give Claude the sermon notes, confirm the outline it proposes, then save its output as `<title>.lampstand.json` and import it in Lampstand (drop the file, choose it, or paste the JSON).
