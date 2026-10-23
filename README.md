# dotfiles

use `uv sync` then `python manager.py`

## Safe pull

A pull can delete a repo file that a `~/.config` entry symlinks to, leaving the
app with a broken link. Manager option `3` detaches those links first: the
symlink becomes a real copy of its current content, with a backup under
`~/.local/state/dotfiles-backups`.

Same thing from the shell:

    python3 -m bootstrap.pull

- `--check` lists affected links and exits 1, changes nothing.
- `--yes` detaches without asking.
- The first run sets `core.hooksPath` to `bootstrap/hooks`. Its `post-merge`
  hook restores links that a plain `git pull` already broke, using the
  pre-pull commit.
