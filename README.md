# DnB! Drop and Boom — Orca plugin

A falling-block puzzle game for [Orca](https://github.com/stablyai/orca)'s right sidebar: something to play while the agent works.

## Install

```sh
orca plugin install thanut-suw-work/orca-dnb-plugin
```

Orca asks you to approve it: re-run the command with the `--approve <fingerprint>` it prints. Then open the **puzzle** icon in Orca's right sidebar → **DnB!**

Requires Orca 1.4.246 or later. Update later with `orca plugin update`.

### From a zip instead

Unzip the folder somewhere you will keep it, then run `orca plugin install <folder>` (or Settings → Plugins → Development folders… → add it).

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

## Credits and license

DnB! was made by Thanut Suwannawong with the help of Grok (xAI's app builder), then packaged as an Orca plugin.

Free to use, share and modify under the [MIT License](LICENSE). The bundled open-source libraries keep their own licenses: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
