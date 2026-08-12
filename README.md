# Dotfiles

Linux workstation configuration, organized as a partial `$HOME` tree.

## Install

Preview changes:

```sh
python3 install.py --dry-run
```

Install with backups:

```sh
python3 install.py
```

Install selected entries:

```sh
python3 install.py --only Neovim --only WezTerm
```

Backups go to `~/.local/state/dotfiles-backups/`.

## Layout

- `home/` — static files linked into `$HOME`
- `bootstrap/manifest.json` — source and destination mapping
- `bootstrap/install.py` — backup-aware symlink installer
- `system/` — system/application exports needing manual application
- `hardware/` — keyboard and device data

Pi runtime state stays in `~/.pi/agent`. Only tracked Pi settings, MCP config, and skills live here; packages, sessions, caches, and credentials stay outside Git.

KDE files under `system/kde/` are exports. Review them before importing into KDE; they are not blindly symlinked by installer.
