# DnB! Drop and Boom — Orca plugin

A falling-block puzzle game for [Orca](https://github.com/stablyai/orca)'s right sidebar: something to play while the agent works.

## Install

1. Unzip `orca-dnb-plugin.zip` somewhere you will keep it (for example `~/orca-plugins/orca-dnb-plugin`).
2. Install it, either:
   - **Terminal:** `orca plugin install ~/orca-plugins/orca-dnb-plugin`
     Orca asks you to approve it: re-run the command with the `--approve <fingerprint>` it prints.
   - **Orca app:** Settings → Plugins → Development folders… → add the unzipped folder, then review and enable it.
3. Open the **puzzle** icon in Orca's right sidebar → **DnB!**

Requires Orca 1.4.246 or later.

## Controls

| Key | Action |
| --- | --- |
| ← → | Move |
| X / Z | Rotate right / left |
| ↓ / Space | Soft / hard drop |
| C | Hold |
| Esc | Pause |

Click the game first so it gets keyboard focus.

## Privacy and access

- `sandboxed-ui` panel with **no capabilities**: no workspace, terminal or agent access.
- Fully offline: the whole game is inlined in `panel/index.html`; no network requests or tracking.
- High score and settings stay in the panel's own `localStorage`.

## License

MIT
