# PVZ Garden

A pixel-art plant-raising game for iPhone and iPad (a private family fan game inspired by Plants vs. Zombies),
installed from Safari as a Home Screen app.

This folder is the **built site**. Don't edit files here by hand. The game source lives in `../pvz-garden/`, and
`python3 ../tools/build_pvz.py` rebuilds this folder (it keeps this README).

## One-time setup (about 10 minutes)

1. In **GitHub Desktop**, choose **File › Add Local Repository…** and pick this `pvz-garden-app` folder.
   It will offer to **create a repository** here: do that, type "First version" in the summary box, click
   **Commit to main**, then click **Publish repository**. Keep the name `pvz-garden-app` and untick
   **Keep this code private** (free GitHub Pages sites need a public repository).
2. On github.com, open the repository, then **Settings › Pages**. Under **Build and deployment** choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, and **Save**.
3. After a minute or two the page shows the address, like `https://<your-name>.github.io/pvz-garden-app/`.

It sits next to Solunar Sprouts on the same github.io address without touching it: the two games keep separate
saves, separate offline copies and separate backup codes.

## Installing on each iPhone or iPad

1. Open the address in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Always launch from the new **PVZ Garden** icon. Progress saved in the Home Screen app is separate from Safari.
4. Each child taps their own card on **Who's playing?**, or **New player**. A new player picks a Peashooter,
   Sunflower or Chomper to start.

## Publishing an update

1. Ask Claude to make changes; Claude runs `python3 tools/build_pvz.py`, which refreshes this folder. It runs
   `tools/check_pvz.js` first; if anything fails the build stops and nothing here changes.
2. In GitHub Desktop, write a short summary, click **Commit to main**, then **Push origin**.
3. Within a few minutes, open phones see "A new version is ready". Saves are kept.

## Keeping progress safe

- **Almanac › Backups** (also on the main menu) makes a backup code (it starts with `PVZGARDEN1`). Keep it in
  Notes or an email; paste it into **Restore** on a new or reset phone.
- Each device also keeps the last three days' saves automatically and brings one back if a save is ever damaged.
- Parent-only actions ask a quick maths question first.

## Good to know

- Works offline after the first launch.
- Deleting the Home Screen icon deletes that app's saved games, so back up first.
- Renaming the repository changes the address, which starts saves from scratch. Restore from backup codes if so.
