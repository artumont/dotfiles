#!/usr/bin/env python3
"""Interactive dotfiles manager: add new files/folders to the manifest, install them, and manage icons."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from bootstrap import icons as icon
from bootstrap.manifest import (
    ROOT,
    human_size,
    list_candidates,
    suggest_dest,
)
from bootstrap.install import (
    DEFAULT_BACKUP_DIR,
    DEFAULT_MANIFEST,
    destination_path,
    install_link,
    load_manifest,
    source_path,
)

MANIFEST_PATH = ROOT / "bootstrap" / "manifest.json"

# --- screen ----------------------------------------------------------------

_CLEAR = ["cls"] if os.name == "nt" else ["clear"]


def clear() -> None:
    subprocess.run(_CLEAR, check=False)


def pause(msg: str = "Press enter to continue...") -> None:
    input(dim(f"\n  {msg}"))


# --- color -----------------------------------------------------------------

_USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None


def _c(code: str, text: object) -> str:
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else str(text)


def bold(text: object) -> str:
    return _c("1", text)


def dim(text: object) -> str:
    return _c("2", text)


def red(text: object) -> str:
    return _c("31", text)


def green(text: object) -> str:
    return _c("32", text)


def yellow(text: object) -> str:
    return _c("33", text)


def blue(text: object) -> str:
    return _c("34", text)


def magenta(text: object) -> str:
    return _c("35", text)


def cyan(text: object) -> str:
    return _c("36", text)


def white(text: object) -> str:
    return _c("37", text)


# --- box drawing -----------------------------------------------------------

SEP = dim("─" * 52)


def header(title: str) -> None:
    clear()
    print()
    print(f"  {magenta('◆')} {bold(title)}")
    print(f"  {SEP}")


def footer() -> None:
    print(f"  {SEP}")


# --- prompts ---------------------------------------------------------------


def ask(prompt: str, default: str = "") -> str:
    if default:
        raw = input(f"  {cyan('▸')} {prompt} {dim(f'[{default}]')}: ").strip()
        return raw or default
    return input(f"  {cyan('▸')} {prompt}: ").strip()


def confirm(prompt: str, default_yes: bool = True) -> bool:
    suffix = green("Y/n") if default_yes else yellow("y/N")
    answer = input(f"  {cyan('▸')} {prompt} ({suffix}): ").strip().lower()
    if not answer:
        return default_yes
    return answer in ("y", "yes")


# --- error screen ----------------------------------------------------------


def error_screen(error: Exception) -> None:
    header("Error")
    print(f"\n  {red(str(error))}\n")
    footer()
    pause()


# --- add entry -------------------------------------------------------------


def add_entry(manifest_path: Path) -> bool:
    candidates = list_candidates(manifest_path)

    header("Add dotfile")
    print(dim("  Pick a source from the repo, or type a custom path.\n"))
    print_candidates(candidates)

    source = choose_source(candidates)
    if source is None:
        return False

    clear()
    header("Add dotfile")
    kind = dim("folder") if (ROOT / source).is_dir() else dim("file")
    print(f"  Source:  {blue(source)} ({kind})\n")

    dest = choose_dest(source)
    if dest is None:
        return False

    name = ask("Name", Path(source).name.replace("-", " ").replace("_", " ").title())

    entries = load_manifest(manifest_path)
    if any(entry["source"] == source for entry in entries):
        if not confirm(
            yellow(f"warning: '{source}' already in manifest. Add duplicate?"),
            default_yes=False,
        ):
            return False

    entries.append({"name": name, "source": source, "dest": dest})

    with manifest_path.open("w", encoding="utf-8") as file:
        json.dump({"links": entries}, file, indent=2)
        file.write("\n")

    clear()
    header("Dotfile added")
    print()
    print(f"  {green('✓')} {bold(name)}")
    print(f"    {dim('from')} {blue(source)}")
    print(f"    {dim('to  ')} {cyan(dest)}")
    print(f"    {dim(str(manifest_path))}")
    footer()
    pause()
    return True


# --- manifest TUI ----------------------------------------------------------


def print_candidates(candidates: list[Path]) -> None:
    if not candidates:
        print(yellow("\n  (nothing left to add)\n"))
        return

    max_len = max(len(str(p)) for p in candidates)
    for index, path in enumerate(candidates, start=1):
        full = ROOT / path
        idx = dim(f"{index:>3}")
        if full.is_dir():
            label = blue(f"{path}/".ljust(max_len + 1))
            tag = dim("📁")
        else:
            size = full.stat().st_size if full.exists() else 0
            label = white(str(path).ljust(max_len))
            tag = dim(f"📄 {human_size(size)}")
        print(f"  {idx}  {label}  {tag}")
    print()


def choose_source(candidates: list[Path]) -> str | None:
    while True:
        raw = ask("Source (number or path, 'q' to cancel)")
        if not raw or raw.lower() in ("q", "quit"):
            return None

        try:
            index = int(raw) - 1
        except ValueError:
            index = -1
        if 0 <= index < len(candidates):
            return str(candidates[index])

        path = Path(raw)
        if (ROOT / path).is_file() or (ROOT / path).is_dir():
            return str(path)
        print(red(f"  ✗ not found: {ROOT / path}"))


def choose_dest(source: str) -> str | None:
    suggested = suggest_dest(source)
    kind = "folder" if (ROOT / source).is_dir() else "file"
    dest = ask(f"Destination in $HOME ({kind})", suggested)

    expanded = destination_path(dest)
    if expanded.exists() or expanded.is_symlink():
        resolved = None
        try:
            resolved = source_path(source)
        except OSError:
            pass
        if (
            resolved is not None
            and expanded.is_symlink()
            and expanded.resolve() == resolved
        ):
            print(yellow("  ↳ already linked, nothing to do"))
            return None
        if not confirm(f"{expanded} exists. Replace it on install?", default_yes=False):
            return None
    return dest


def install_interactively(manifest_path: Path) -> None:
    entries = load_manifest(manifest_path)
    if not entries:
        clear()
        header("Install")
        print(yellow("\n  Manifest empty — nothing to install.\n"))
        footer()
        pause()
        return

    backup_dir = DEFAULT_BACKUP_DIR.expanduser().resolve()
    installed = skipped = failed = 0

    clear()
    header(f"Install ({len(entries)} entries)")
    print(dim("  y = install    n/s = skip    a = all remaining    q = quit\n"))

    install_all_remaining = False
    for entry in entries:
        label = entry["name"]
        try:
            src = source_path(entry["source"])
            dst = destination_path(entry["dest"])
            already = dst.is_symlink() and dst.resolve() == src
        except (OSError, ValueError) as error:
            print(red(f"  ✗ {label}: {error}"))
            failed += 1
            continue

        if already:
            print(f"  {dim('•')} {bold(label)}  {yellow('already linked')}")
            skipped += 1
            continue

        print(f"\n  {dim('•')} {bold(label)}")
        print(f"    {blue(str(src))} → {cyan(str(dst))}")

        if not install_all_remaining:
            answer = input(f"    install? {dim('(y/n/a/q)')} ").strip().lower()
            if answer == "q":
                break
            if answer == "a":
                install_all_remaining = True
            elif answer in ("n", "s", "no", "skip"):
                print(f"    {dim('skipped')}")
                skipped += 1
                continue

        try:
            install_link(entry, dry_run=False, make_backup=True, backup_dir=backup_dir)
            print(f"    {green('✓ installed')}")
            installed += 1
        except (OSError, ValueError) as error:
            print(f"    {red(f'✗ failed: {error}')}")
            failed += 1

    footer()
    print()
    parts = [green(f"{installed} installed"), f"{skipped} skipped"]
    if failed:
        parts.append(red(f"{failed} failed"))
    else:
        parts.append("0 failed")
    print(f"  Done: {', '.join(parts)}")
    if installed:
        print(f"  {dim(f'Backups: {backup_dir}')}")
    print()
    pause()


def show_manifest(manifest_path: Path) -> None:
    entries = load_manifest(manifest_path)

    header(f"Manifest ({len(entries)} entries)\n")

    max_name = max(len(e["name"]) for e in entries) if entries else 0
    max_src = max(len(e["source"]) for e in entries) if entries else 0

    for entry in entries:
        exists = (ROOT / entry["source"]).exists()
        tag = green(" ✓") if exists else red(" ✗")
        name = bold(entry["name"].ljust(max_name))
        src = blue(entry["source"].ljust(max_src))
        dst = cyan(entry["dest"])
        print(f"  {tag}  {name}  {dim('→')}  {src}  {dim('→')}  {dst}")

    footer()
    pause()


# --- icon TUI --------------------------------------------------------------


def _pick_category() -> str | None:
    """Show category list, return selected category or None on cancel."""
    for i, (cat, desc) in enumerate(icon.ICON_CATEGORIES, 1):
        print(f"      {dim(f'{i:>2}.')} {bold(cat)}  {dim(desc)}")
    print()
    raw_cat = ask("Category", "1")
    if not raw_cat or raw_cat.lower() in ("q", "quit"):
        return None
    try:
        cat_idx = int(raw_cat) - 1
        return icon.ICON_CATEGORIES[cat_idx][0]
    except (ValueError, IndexError):
        return raw_cat.strip() or None


def icon_install() -> None:
    header("Install icon")
    print(dim(f"  Scale a {icon.MIN_ICON_SIZE}x{icon.MIN_ICON_SIZE}+ icon to all hicolor sizes."))
    print(dim(f"  Source: {icon.REPO_ICONS_DIR}/"))
    print()

    # scan repo icons
    repo_icons = icon.scan_repo_icons()

    if not repo_icons:
        print(yellow("  No icons found in icons/."))
        print()
        print(dim("  Add PNG/SVG files to icons/{category}/ and try again."))
        footer()
        pause()
        return

    # grouped list
    by_cat = icon.repo_icons_by_category()
    idx = 0
    max_name = max(len(ri.name) for ri in repo_icons)
    for cat in sorted(by_cat):
        items = by_cat[cat]
        print(f"    {bold(cat)}")
        for ri in items:
            idx += 1
            dims = icon.get_image_dimensions(ri.path)
            dim_str = f"{dims[0]}x{dims[1]}" if dims else dim("?")
            print(f"      {dim(f'{idx:>3}')}  {green(ri.name.ljust(max_name))}  {dim(dim_str)}  {dim(ri.path.suffix)}")
    print()
    print(f"    {dim(f'{idx + 1}')}  {dim('(type a custom path)')}")
    print()

    # pick
    raw = ask(f"Pick icon (1-{idx + 1}) or path, 'q' to cancel")
    if not raw or raw.lower() in ("q", "quit"):
        return

    try:
        pick = int(raw)
    except ValueError:
        pick = -1

    if 1 <= pick <= idx:
        selected = repo_icons[pick - 1]
        src = selected.path
        category = selected.category
        suggested_name = selected.name
        if category == "uncategorized":
            print()
            picked = _pick_category()
            if picked is None:
                return
            category = picked
    else:
        # custom path — resolve relative to repo root
        src = Path(raw).expanduser()
        if not src.is_absolute():
            src = ROOT / src
        src = src.resolve()
        if not src.exists():
            print(red(f"  ✗ not found: {src}"))
            pause()
            return
        print()
        picked = _pick_category()
        if picked is None:
            return
        category = picked
        suggested_name = src.stem.lower().replace(" ", "_").replace("-", "_")

    # name
    name = ask("Icon name", suggested_name)
    if not name:
        print(red("  ✗ empty name"))
        pause()
        return
    name = name.lower().replace(" ", "_").replace("-", "_")

    # validate
    clear()
    header("Validate icon")
    print()
    print(f"  {dim('source:')}     {blue(str(src))}")
    print(f"  {dim('name:')}       {bold(name)}")
    print(f"  {dim('category:')}   {bold(category)}")
    print()

    ok, error = icon.validate_source(src)
    if not ok:
        print(f"  {red('✗ validation failed')}")
        print(f"    {red(error)}")
        footer()
        pause()
        return

    print(f"  {green('✓ validation passed')}")
    print()

    # preview
    sizes = icon.ICON_SIZES + icon.ICON_SIZES_2X
    print(dim(f"  Will generate {len(sizes)} files:"))
    print()
    for size in sizes:
        label = icon.size_label(size)
        target = icon.install_dir(size, category) / f"{name}.png"
        exists = target.exists()
        status = yellow("(exists)") if exists else ""
        print(f"    {dim('→')} {label:>16}  {dim(str(target))} {status}")
    print()

    if not confirm(f"Install {name}?"):
        return

    # install
    clear()
    header(f"Installing {bold(name)}")
    print()

    is_svg = src.suffix.lower() == ".svg"
    installed = 0
    for size in sizes:
        target = icon.install_dir(size, category) / f"{name}.png"
        try:
            if is_svg:
                icon.copy_svg(src, target)
            else:
                icon.scale_icon(src, size, target)
            print(f"  {green('✓')} {icon.size_label(size):>16}  {dim(str(target))}")
            installed += 1
        except Exception as error:
            print(f"  {red('✗')} {size}x{size}  {red(str(error))}")

    footer()
    print()
    print(f"  {green(f'✓ {installed}/{len(sizes)} sizes installed')}")
    print(f"  {dim(f'Base: {icon.HICOLOR_BASE}')}")
    pause()


def icon_list() -> None:
    icons = icon.installed_icons()

    header("Installed icons")
    print()

    if not icons:
        print(yellow("  No icons found."))
        footer()
        pause()
        return

    by_cat: dict[str, list[tuple[str, list[int]]]] = {}
    for name, cats in sorted(icons.items()):
        for cat, sizes in sorted(cats.items()):
            by_cat.setdefault(cat, []).append((name, sizes))

    for cat in sorted(by_cat):
        items = by_cat[cat]
        print(f"  {bold(cat)} ({len(items)} icons)")
        for name, sizes in items:
            counts: dict[int, int] = {}
            for s in sizes:
                counts[s] = counts.get(s, 0) + 1
            human = ", ".join(
                f"{s}x{s}" if c == 1 else f"{s}x{s} (×{c})" for s, c in sorted(counts.items())
            )
            print(f"    {green('•')} {bold(name)}  {dim(human)}")
        print()

    footer()
    pause()


def icon_remove() -> None:
    icons = icon.installed_icons()

    header("Remove icon")
    print()

    if not icons:
        print(yellow("  No icons found."))
        footer()
        pause()
        return

    all_names = sorted(icons.keys())
    max_len = max(len(n) for n in all_names)
    for i, name in enumerate(all_names, 1):
        cats = icons[name]
        cat_parts = []
        for cat, sizes in sorted(cats.items()):
            cat_parts.append(f"{cat}: {len(sizes)} sizes")
        print(f"  {dim(f'{i:>3}')}  {bold(name.ljust(max_len))}  {dim(', '.join(cat_parts))}")
    print()

    raw = ask("Icon name or number to remove (or 'q')")
    if not raw or raw.lower() in ("q", "quit"):
        return

    try:
        idx = int(raw) - 1
        target_name = all_names[idx]
    except (ValueError, IndexError):
        target_name = raw.strip().lower()

    if target_name not in icons:
        print(red(f"  ✗ icon '{target_name}' not found"))
        pause()
        return

    total_files = sum(len(sizes) for sizes in icons[target_name].values())
    print()
    print(f"  {bold(target_name)}: {total_files} files across {len(icons[target_name])} categories")
    if not confirm(f"Remove all files for '{target_name}'?", default_yes=False):
        return

    clear()
    header(f"Removing {bold(target_name)}")
    print()

    removed = icon.remove_icon_files(target_name, icons)

    footer()
    print()
    print(f"  {green(f'✓ removed {removed}/{total_files} files')}")
    pause()


def icon_menu() -> None:
    while True:
        header("Icon manager")
        print()
        print(f"  {dim('Repo source:')}  {icon.REPO_ICONS_DIR}/")
        print(f"  {dim('Install to:')}    {icon.HICOLOR_BASE}/")
        print(f"  {dim('Min size:')}      {icon.MIN_ICON_SIZE}x{icon.MIN_ICON_SIZE}")
        print(f"  {dim('Sizes:')}         {', '.join(str(s) for s in icon.ICON_SIZES)}")
        print(f"  {dim('HiDPI @2x:')}    {', '.join(str(s) for s in icon.ICON_SIZES_2X)}")

        # show repo icon count
        repo_count = len(icon.scan_repo_icons())
        print()
        if repo_count:
            print(f"  {green(repo_count)} source icon(s) in {blue('icons/')}")
        else:
            print(yellow("  No icons in icons/ — add PNG/SVG files to icons/{category}/"))
        print()
        print(f"    {green('1')}  {dim('▸')}  Install icon (scale to all sizes)")
        print(f"    {cyan('2')}  {dim('▸')}  List installed icons")
        print(f"    {red('3')}  {dim('▸')}  Remove icon")
        print(f"    {dim('q')}  {dim('▸')}  Back to main menu")
        print()

        choice = input(f"  {green('▸')} ").strip().lower()
        if choice in ("q", "quit", ""):
            break
        if choice == "1":
            try:
                icon_install()
            except Exception as error:
                error_screen(error)
        elif choice == "2":
            try:
                icon_list()
            except Exception as error:
                error_screen(error)
        elif choice == "3":
            try:
                icon_remove()
            except Exception as error:
                error_screen(error)
        else:
            clear()
            header("Error")
            print(f"\n  {red('Unknown option.')}\n")
            footer()
            pause()


# --- main menu -------------------------------------------------------------


def menu() -> int:
    manifest_path = MANIFEST_PATH

    while True:
        header("Dotfiles manager")
        print()
        print(f"    {green('1')}  {dim('▸')}  Add new file / folder to manifest")
        print(f"    {cyan('2')}  {dim('▸')}  Install (interactive, skip entries)")
        print(f"    {blue('3')}  {dim('▸')}  Show manifest")
        print(f"    {magenta('4')}  {dim('▸')}  Icon manager")
        print(f"    {dim('q')}  {dim('▸')}  Quit")
        print()

        choice = input(f"  {green('▸')} ").strip().lower()
        if choice in ("q", "quit", ""):
            clear()
            break

        if choice == "1":
            try:
                add_entry(manifest_path)
            except (OSError, ValueError, json.JSONDecodeError) as error:
                error_screen(error)
        elif choice == "2":
            try:
                install_interactively(manifest_path)
            except (OSError, ValueError, json.JSONDecodeError) as error:
                error_screen(error)
        elif choice == "3":
            try:
                show_manifest(manifest_path)
            except (OSError, ValueError, json.JSONDecodeError) as error:
                error_screen(error)
        elif choice == "4":
            try:
                icon_menu()
            except Exception as error:
                error_screen(error)
        else:
            clear()
            header("Error")
            print(f"\n  {red('Unknown option.')}\n")
            footer()
            pause()

    return 0


if __name__ == "__main__":
    raise SystemExit(menu())
