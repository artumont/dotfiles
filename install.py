import json
import os
import shutil
import subprocess
from pathlib import Path


def load_settings() -> dict:
    settings_file = Path.cwd() / "settings.json"
    if not settings_file.exists():
        raise RuntimeError("No settings file present in root dir.")
    with settings_file.open() as f:
        return json.load(f)


def create_backup(to_backup: Path) -> None:
    backup_dir = Path.cwd() / ".backups"
    if not backup_dir.exists():
        print("Creating backup directory...")
        backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / (to_backup.name + ".bak")
    if backup_path.exists():
        print(f"Backup path {backup_path} already exists, skipping backup...")
        return
    print(f"Creating backup for {to_backup} at {backup_path}...")
    if to_backup.is_file():
        shutil.copy2(to_backup, backup_path)
    elif to_backup.is_dir():
        shutil.copytree(to_backup, backup_path)
    print(f"Backup created for {to_backup} at {backup_path}.")


def create_symlinks(config: dict) -> None:
    symlinks = config.get("symlinks", [])
    for symlink in symlinks:
        name = symlink.get("name", None)
        print(f"Setting up symlink for {name}...")

        raw_source = symlink.get("source", None)
        if not raw_source:
            raise RuntimeError(
                f"Source not present within the symlink config of {name}"
            )

        source_path = Path(os.path.expanduser(raw_source)).resolve()
        if not source_path.exists():
            raise RuntimeError(f"Source path {source_path} does not exist for {name}")

        raw_dest = symlink.get("dest", None)
        if not raw_dest:
            raise RuntimeError(
                f"Destination not present within the symlink config of {name}"
            )

        clean_dest = raw_dest.rstrip("/")
        dest_path = Path(os.path.expanduser(clean_dest))

        if dest_path.exists() or dest_path.is_symlink():
            if dest_path.is_symlink():
                print(
                    f"Destination path {dest_path} already exists as a symlink for {name}, removing it..."
                )
                dest_path.unlink()
            else:
                print(
                    f"Destination path {dest_path} already exists for {name}, creating backup and removing..."
                )
                create_backup(dest_path)
                shutil.rmtree(dest_path) if dest_path.is_dir() else dest_path.unlink()

        dest_path.parent.mkdir(parents=True, exist_ok=True)

        print(f"Creating symlink for {name} from {source_path} to {dest_path}...")
        subprocess.run(["ln", "-sfn", str(source_path), str(dest_path)], check=True)
        print(f"Symlink created for {name} from {source_path} to {dest_path}.")


if __name__ == "__main__":
    config = load_settings()
    create_symlinks(config)
