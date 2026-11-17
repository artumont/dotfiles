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

## GUI

`python3 manager.py` abre la interfaz con cuatro pestañas:

- Vínculos: estado de cada entrada del manifest, instalar marcadas, dry run, safe pull, agregar entrada y ver el JSON.
- Iconos: fuentes en `desktop/icons/` contra lo instalado en hicolor, con instalar y quitar.
- Secretos: items del keyring de GNOME (agregar, actualizar, borrar, ver todos).
- Log: salida de cada acción.

Va con el python del sistema, no con el venv de uv, porque PyGObject viene del
distro (`python3-gi`). Lo único que hace falta instalar aparte es secretstorage:

    python3 -m pip install --user --break-system-packages secretstorage

El keyring no viaja en el repo: solo los nombres que aparecen en la lista
`secrets` de `bootstrap/manifest.json`. En una máquina nueva abre la pestaña
Secretos y usa "Sembrar faltantes"; cada valor se pega en un campo oculto.

Los valores se leen desde el shell con `secret-tool` (paquete
`libsecret-tools`), por ejemplo:

    secret-tool lookup service bws:access-token
