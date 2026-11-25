# DnB! Drop and Boom — Orca plugin

A falling-block puzzle game for [Orca](https://github.com/stablyai/orca)'s right sidebar: something to play while the agent works.

## Install

```sh
orca plugin install thanut-suwannawong_scbtechx/orca-dnb-plugin
```

Orca asks you to approve it (re-run with the `--approve <fingerprint>` it prints). Then open the **blocks** icon → **DnB!**.

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
