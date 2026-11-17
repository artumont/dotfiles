#!/usr/bin/env python3
"""Dotfiles manager: vínculos del manifest, iconos y secretos del keyring en una GUI."""
import json
import os
import subprocess
import sys
import threading
from pathlib import Path

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Pango", "1.0")
from gi.repository import GLib, Gtk, Pango  # noqa: E402

from bootstrap import icons as icon  # noqa: E402
from bootstrap.manifest import list_candidates  # noqa: E402

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "bootstrap" / "manifest.json"

# (servicio, cuenta, etiqueta, de dónde sale el valor)
KNOWN = [
    (
        "bws-mcp",
        "access-token",
        "BWS access token (pi agent)",
        "Bitwarden web > Secrets Manager > machine account > access token",
    ),
]


# --- helpers ---------------------------------------------------------------


def expand(path: str) -> Path:
    return Path(os.path.expanduser(path))


def link_state(entry: dict) -> str:
    dest = expand(entry["dest"])
    source = ROOT / entry["source"]
    if dest.is_symlink():
        try:
            if dest.resolve() == source.resolve():
                return "enlazado"
            return f"enlace a {dest.resolve()}"
        except OSError:
            return "enlace roto"
    if dest.exists():
        return "archivo real (se respalda)"
    return "sin instalar"


def keyring():
    import secretstorage

    bus = secretstorage.dbus_init()
    collection = secretstorage.get_default_collection(bus)
    if collection.is_locked():
        raise RuntimeError("el keyring está bloqueado: desbloquéalo en el escritorio")
    return secretstorage, bus, collection


def keyring_get(service: str, account: str) -> bytes | None:
    secretstorage, bus, _ = keyring()
    items = list(secretstorage.search_items(bus, {"service": service, "account": account}))
    return items[0].get_secret() if items else None


def keyring_set(service: str, account: str, value: str, label: str = "") -> None:
    _, _, collection = keyring()
    collection.create_item(
        label or f"{service}/{account}",
        {"service": service, "account": account},
        value.encode(),
        replace=True,
    )


def keyring_delete(service: str, account: str) -> int:
    secretstorage, bus, _ = keyring()
    items = list(secretstorage.search_items(bus, {"service": service, "account": account}))
    for item in items:
        item.delete()
    return len(items)


def keyring_items() -> list[tuple[str, str, str]]:
    _, _, collection = keyring()
    rows = []
    for item in collection.get_all_items():
        attrs = item.get_attributes()
        rows.append((attrs.get("service", "-"), attrs.get("account", "-"), item.get_label()))
    return sorted(rows)


# --- ventana ---------------------------------------------------------------


class Tools(Gtk.Window):
    def __init__(self):
        super().__init__(title="Dotfiles manager")
        self.set_default_size(1060, 680)
        self.set_size_request(720, 480)

        header = Gtk.HeaderBar()
        header.set_show_close_button(True)
        header.props.title = "Dotfiles"
        header.props.subtitle = str(ROOT)
        self.set_titlebar(header)

        notebook = Gtk.Notebook()
        notebook.append_page(self.links_page(), Gtk.Label(label="Vínculos"))
        notebook.append_page(self.icons_page(), Gtk.Label(label="Iconos"))
        notebook.append_page(self.secrets_page(), Gtk.Label(label="Secretos"))
        notebook.append_page(self.log_page(), Gtk.Label(label="Log"))
        self.add(notebook)

        self.refresh_links()
        self.refresh_icons()
        self.refresh_secrets()

    # --- infraestructura ---------------------------------------------------

    def log(self, text: str, code: int | None = None):
        end = self.buffer.get_end_iter()
        self.buffer.insert(end, text.rstrip() + "\n\n")
        if code is not None:
            self.mark.set_text("ok" if code == 0 else f"exit {code}")
        self.view.scroll_to_iter(self.buffer.get_end_iter(), 0.0, False, 0.0, 0.0)

    def run_async(self, cmd, on_done=None):
        def worker():
            try:
                proc = subprocess.run(
                    [str(part) for part in cmd], cwd=str(ROOT), capture_output=True, text=True, timeout=900
                )
                out = (proc.stdout or "") + (proc.stderr or "")
                code = proc.returncode
            except Exception as error:  # noqa: BLE001
                out, code = f"error: {error}", 1
            GLib.idle_add(self._finished, f"$ {' '.join(str(c) for c in cmd)}\n{out}", code, on_done)

        threading.Thread(target=worker, daemon=True).start()

    def run_task(self, fn, label, on_done=None):
        def worker():
            try:
                out, code = fn(), 0
            except Exception as error:  # noqa: BLE001
                out, code = f"error: {error}", 1
            GLib.idle_add(self._finished, f"$ {label}\n{out or ''}", code, on_done)

        threading.Thread(target=worker, daemon=True).start()

    def _finished(self, text, code, on_done):
        self.log(text, code)
        if on_done:
            on_done()
        return False

    def manifest_entries(self):
        """Devuelve (entradas, error)."""
        try:
            return json.loads(MANIFEST.read_text(encoding="utf-8")).get("links", []), None
        except (OSError, ValueError) as error:
            return [], f"no pude leer el manifest: {error}"

    def save_manifest(self, entries):
        tmp = MANIFEST.with_suffix(".json.tmp")
        tmp.write_text(json.dumps({"links": entries}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        tmp.replace(MANIFEST)

    # --- vínculos ----------------------------------------------------------

    def links_page(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.set_border_width(10)

        self.link_store = Gtk.ListStore(bool, str, str, str, str)
        view = Gtk.TreeView(model=self.link_store)
        toggle = Gtk.CellRendererToggle()
        toggle.connect("toggled", self.on_toggle)
        view.append_column(Gtk.TreeViewColumn("", toggle, active=0))
        for index, title, width, expand in (
            (1, "Nombre", 200, False),
            (2, "Origen", 320, True),
            (3, "Destino", 320, True),
            (4, "Estado", 220, False),
        ):
            renderer = Gtk.CellRendererText()
            renderer.set_property("ellipsize", Pango.EllipsizeMode.MIDDLE)
            column = Gtk.TreeViewColumn(title, renderer, text=index)
            column.set_resizable(True)
            column.set_min_width(width)
            column.set_expand(expand)
            view.append_column(column)

        scroller = Gtk.ScrolledWindow()
        scroller.add(view)
        box.pack_start(scroller, True, True, 0)

        buttons = Gtk.Box(spacing=6)
        for label, handler in (
            ("Recargar", lambda *_: self.refresh_links()),
            ("Instalar marcados", self.on_install),
            ("Dry run", self.on_dry_run),
            ("Safe pull", self.on_pull),
            ("Agregar…", self.on_add_entry),
            ("Ver manifest", self.on_show_manifest),
        ):
            button = Gtk.Button(label=label)
            button.connect("clicked", handler)
            buttons.pack_start(button, False, False, 0)
        box.pack_start(buttons, False, False, 0)

        self.link_status = Gtk.Label(xalign=0)
        box.pack_start(self.link_status, False, False, 0)
        return box

    def refresh_links(self):
        entries, error = self.manifest_entries()
        if error:
            self.link_store.clear()
            self.link_status.set_text(error)
            return
        self.link_store.clear()
        for entry in entries:
            self.link_store.append([False, entry["name"], entry["source"], entry["dest"], link_state(entry)])
        linked = sum(1 for entry in entries if link_state(entry) == "enlazado")
        self.link_status.set_text(f"{len(entries)} entradas, {linked} enlazadas")

    def on_toggle(self, _renderer, path):
        self.link_store[path][0] = not self.link_store[path][0]

    def marked_links(self):
        return [row[1] for row in self.link_store if row[0]]

    def on_install(self, _button=None):
        cmd = [sys.executable, "-m", "bootstrap.install"]
        for name in self.marked_links():
            cmd += ["--only", name]
        self.run_async(cmd, self.refresh_links)

    def on_dry_run(self, _button=None):
        cmd = [sys.executable, "-m", "bootstrap.install", "--dry-run"]
        for name in self.marked_links():
            cmd += ["--only", name]
        self.run_async(cmd)

    def on_pull(self, _button=None):
        self.run_async([sys.executable, "-m", "bootstrap.pull", "--yes"], self.refresh_links)

    def on_show_manifest(self, _button=None):
        dialog = Gtk.Dialog(title="manifest.json", transient_for=self)
        dialog.set_default_size(820, 560)
        dialog.add_button("Cerrar", Gtk.ResponseType.CLOSE)
        text = Gtk.TextView()
        text.set_monospace(True)
        text.get_buffer().set_text(MANIFEST.read_text(encoding="utf-8"))
        scroller = Gtk.ScrolledWindow()
        scroller.add(text)
        dialog.get_content_area().add(scroller)
        dialog.show_all()
        dialog.run()
        dialog.destroy()

    def on_add_entry(self, _button=None):
        try:
            candidates = [str(path) for path in list_candidates(MANIFEST)]
        except Exception:  # noqa: BLE001
            candidates = []

        dialog = Gtk.Dialog(title="Agregar al manifest", transient_for=self)
        dialog.add_buttons("Cancelar", Gtk.ResponseType.CANCEL, "Agregar", Gtk.ResponseType.OK)
        grid = Gtk.Grid(column_spacing=10, row_spacing=8, margin=12)
        dialog.get_content_area().add(grid)

        name_entry = Gtk.Entry()
        source_combo = Gtk.ComboBoxText.new_with_entry()
        for candidate in candidates:
            source_combo.append_text(candidate)
        dest_entry = Gtk.Entry()
        dest_entry.set_placeholder_text("~/.config/algo")

        for row, (label, widget) in enumerate(
            (("Nombre", name_entry), ("Origen", source_combo), ("Destino", dest_entry))
        ):
            grid.attach(Gtk.Label(label=label, xalign=0), 0, row, 1, 1)
            grid.attach(widget, 1, row, 1, 1)

        dialog.show_all()
        accepted = dialog.run() == Gtk.ResponseType.OK
        name = name_entry.get_text().strip()
        source = (source_combo.get_active_text() or "").strip()
        dest = dest_entry.get_text().strip()
        dialog.destroy()
        if not accepted or not (name and source and dest):
            return

        entries, error = self.manifest_entries()
        if error:
            self.link_status.set_text(error)
            return
        if any(entry["source"] == source for entry in entries):
            self.link_status.set_text(f"{source} ya está en el manifest")
            return
        entries.append({"name": name, "source": source, "dest": dest})
        self.save_manifest(entries)
        self.refresh_links()
        self.run_async([sys.executable, "-m", "bootstrap.install", "--only", name], self.refresh_links)

    # --- iconos ------------------------------------------------------------

    def icons_page(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.set_border_width(10)

        panes = Gtk.Box(spacing=8)
        panes.pack_start(self.repo_icons_widget(), True, True, 0)
        panes.pack_start(self.installed_icons_widget(), True, True, 0)
        box.pack_start(panes, True, True, 0)

        buttons = Gtk.Box(spacing=6)
        for label, handler in (
            ("Recargar", lambda *_: self.refresh_icons()),
            ("Instalar origen marcado", self.on_install_icon),
            ("Quitar marcado", self.on_remove_icon),
        ):
            button = Gtk.Button(label=label)
            button.connect("clicked", handler)
            buttons.pack_start(button, False, False, 0)
        box.pack_start(buttons, False, False, 0)

        self.icon_status = Gtk.Label(xalign=0)
        box.pack_start(self.icon_status, False, False, 0)
        return box

    def repo_icons_widget(self):
        frame = Gtk.Frame(label="En el repo (desktop/icons)")
        self.repo_icon_store = Gtk.ListStore(str, str, str, str)
        view = Gtk.TreeView(model=self.repo_icon_store)
        for index, title, width in ((0, "Nombre", 170), (1, "Categoría", 130), (2, "Tamaño", 100), (3, "Tipo", 60)):
            renderer = Gtk.CellRendererText()
            column = Gtk.TreeViewColumn(title, renderer, text=index)
            column.set_min_width(width)
            column.set_resizable(True)
            view.append_column(column)
        self.repo_icon_view = view
        scroller = Gtk.ScrolledWindow()
        scroller.add(view)
        frame.add(scroller)
        return frame

    def installed_icons_widget(self):
        frame = Gtk.Frame(label="Instalados (hicolor)")
        self.installed_icon_store = Gtk.ListStore(str, str, str)
        view = Gtk.TreeView(model=self.installed_icon_store)
        for index, title, width in ((0, "Nombre", 170), (1, "Categoría", 130), (2, "Tamaños", 220)):
            renderer = Gtk.CellRendererText()
            column = Gtk.TreeViewColumn(title, renderer, text=index)
            column.set_min_width(width)
            column.set_resizable(True)
            column.set_expand(index == 2)
            view.append_column(column)
        self.installed_icon_view = view
        scroller = Gtk.ScrolledWindow()
        scroller.add(view)
        frame.add(scroller)
        return frame

    def refresh_icons(self):
        self.repo_icon_store.clear()
        self.installed_icon_store.clear()
        try:
            sources = icon.scan_repo_icons()
        except Exception as error:  # noqa: BLE001
            self.icon_status.set_text(f"error leyendo iconos: {error}")
            return
        for source in sources:
            dims = icon.get_image_dimensions(source.path)
            self.repo_icon_store.append(
                [
                    source.name,
                    source.category,
                    f"{dims[0]}x{dims[1]}" if dims else "?",
                    source.path.suffix.lstrip("."),
                ]
            )
        try:
            installed = icon.installed_icons()
        except Exception as error:  # noqa: BLE001
            self.icon_status.set_text(f"error leyendo hicolor: {error}")
            return
        for name, categories in sorted(installed.items()):
            for category, sizes in sorted(categories.items()):
                labels = ", ".join(icon.size_label(size) for size in sorted(set(sizes)))
                self.installed_icon_store.append([name, category, labels])
        self.icon_status.set_text(f"{len(sources)} en el repo, {len(installed)} instalados")

    def on_install_icon(self, _button=None):
        model, path = self.repo_icon_view.get_selection().get_selected()
        if path is None:
            self.icon_status.set_text("marca un icono del repo primero")
            return
        name, category = model[path][0], model[path][1]
        source = next((s for s in icon.scan_repo_icons() if s.name == name and s.category == category), None)
        if source is None:
            self.icon_status.set_text(f"no encontré {category}/{name}")
            return
        if category == "uncategorized":
            self.icon_status.set_text("ese icono no tiene categoría; muévelo a desktop/icons/<categoría>/")
            return

        def job():
            ok, error = icon.validate_source(source.path)
            if not ok:
                raise RuntimeError(error)
            lines = []
            if source.path.suffix.lower() == ".svg":
                target = icon.category_dir(icon.SCALABLE_SIZE, category) / f"{name}.svg"
                icon.copy_svg(source.path, target)
                lines.append(f"scalable -> {target}")
            else:
                for size in icon.ICON_SIZES + icon.ICON_SIZES_2X:
                    target = icon.category_dir(size, category) / f"{name}.png"
                    icon.scale_icon(source.path, size, target)
                    lines.append(f"{size}x{size} -> {target}")
            return "\n".join(lines)

        self.run_task(job, f"instalar icono {category}/{name}", self.refresh_icons)

    def on_remove_icon(self, _button=None):
        model, path = self.installed_icon_view.get_selection().get_selected()
        if path is None:
            self.icon_status.set_text("marca un icono instalado primero")
            return
        name = model[path][0]
        dialog = Gtk.MessageDialog(
            transient_for=self,
            message_type=Gtk.MessageType.QUESTION,
            buttons=Gtk.ButtonsType.OK_CANCEL,
            text=f"¿Quitar todas las variantes de '{name}'?",
        )
        answer = dialog.run()
        dialog.destroy()
        if answer != Gtk.ResponseType.OK:
            return

        def job():
            return f"{icon.remove_icon_files(name, icon.installed_icons())} archivos borrados"

        self.run_task(job, f"quitar icono {name}", self.refresh_icons)

    # --- secretos ----------------------------------------------------------

    def secrets_page(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.set_border_width(10)

        self.secret_store = Gtk.ListStore(str, str, str, str, str)
        view = Gtk.TreeView(model=self.secret_store)
        self.secret_tree = view
        for index, title, width, expand in (
            (0, "Servicio", 160, False),
            (1, "Cuenta", 170, False),
            (2, "Etiqueta", 240, True),
            (3, "Estado", 110, False),
            (4, "Origen", 340, True),
        ):
            renderer = Gtk.CellRendererText()
            renderer.set_property("ellipsize", Pango.EllipsizeMode.END)
            column = Gtk.TreeViewColumn(title, renderer, text=index)
            column.set_min_width(width)
            column.set_resizable(True)
            column.set_expand(expand)
            view.append_column(column)
        scroller = Gtk.ScrolledWindow()
        scroller.add(view)
        box.pack_start(scroller, True, True, 0)

        buttons = Gtk.Box(spacing=6)
        for label, handler in (
            ("Agregar / actualizar…", self.on_set_secret),
            ("Sembrar faltantes", self.on_seed),
            ("Borrar marcado", self.on_delete_secret),
            ("Ver todos", self.on_list_secrets),
        ):
            button = Gtk.Button(label=label)
            button.connect("clicked", handler)
            buttons.pack_start(button, False, False, 0)
        box.pack_start(buttons, False, False, 0)

        self.secret_status = Gtk.Label(xalign=0)
        box.pack_start(self.secret_status, False, False, 0)
        return box

    def refresh_secrets(self):
        self.secret_store.clear()
        try:
            saved = {(row[0], row[1]) for row in keyring_items()}
        except Exception as error:  # noqa: BLE001
            self.secret_status.set_text(f"no pude abrir el keyring: {error}")
            saved = set()
        missing = 0
        for service, account, label, source in KNOWN:
            found = (service, account) in saved
            missing += 0 if found else 1
            self.secret_store.append([service, account, label, "guardado" if found else "falta", source])
        self.secret_status.set_text(f"{len(KNOWN)} esperados, {missing} sin guardar")

    def on_set_secret(self, _button=None):
        dialog = Gtk.Dialog(title="Guardar secreto", transient_for=self)
        dialog.add_buttons("Cancelar", Gtk.ResponseType.CANCEL, "Guardar", Gtk.ResponseType.OK)
        grid = Gtk.Grid(column_spacing=10, row_spacing=8, margin=12)
        dialog.get_content_area().add(grid)

        service = Gtk.Entry(text="bws-mcp")
        account = Gtk.Entry(text="access-token")
        value = Gtk.Entry()
        value.set_visibility(False)
        value.set_input_purpose(Gtk.InputPurpose.PASSWORD)
        value.set_placeholder_text("se guarda en el keyring, no en disco")

        for row, (label, widget) in enumerate((("Servicio", service), ("Cuenta", account), ("Valor", value))):
            grid.attach(Gtk.Label(label=label, xalign=0), 0, row, 1, 1)
            grid.attach(widget, 1, row, 1, 1)

        dialog.show_all()
        accepted = dialog.run() == Gtk.ResponseType.OK
        data = (service.get_text().strip(), account.get_text().strip(), value.get_text())
        dialog.destroy()
        if not accepted or not all(data):
            return
        self.run_task(
            lambda: f"guardado {data[0]}/{data[1]} ({len(data[2])} bytes)" if keyring_set(*data) is None else "",
            f"set {data[0]}/{data[1]}",
            self.refresh_secrets,
        )

    def on_seed(self, _button=None):
        for service, account, label, source in KNOWN:
            try:
                if keyring_get(service, account):
                    continue
            except Exception as error:  # noqa: BLE001
                self.secret_status.set_text(str(error))
                return
            dialog = Gtk.Dialog(title=f"{service}/{account}", transient_for=self)
            dialog.add_buttons("Saltar", Gtk.ResponseType.CANCEL, "Guardar", Gtk.ResponseType.OK)
            box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8, margin=12)
            dialog.get_content_area().add(box)
            box.pack_start(Gtk.Label(label=source, xalign=0), False, False, 0)
            value = Gtk.Entry()
            value.set_visibility(False)
            value.set_input_purpose(Gtk.InputPurpose.PASSWORD)
            box.pack_start(value, False, False, 0)
            dialog.show_all()
            accepted = dialog.run() == Gtk.ResponseType.OK
            text = value.get_text()
            dialog.destroy()
            if accepted and text:
                self.run_task(
                    lambda s=service, a=account, v=text: f"guardado {s}/{a}" if keyring_set(s, a, v) is None else "",
                    f"set {service}/{account}",
                )
        self.refresh_secrets()

    def on_delete_secret(self, _button=None):
        model, path = self.secret_tree.get_selection().get_selected()
        if path is None:
            self.secret_status.set_text("marca una fila primero")
            return
        service, account = model[path][0], model[path][1]
        dialog = Gtk.MessageDialog(
            transient_for=self,
            message_type=Gtk.MessageType.QUESTION,
            buttons=Gtk.ButtonsType.OK_CANCEL,
            text=f"¿Borrar {service}/{account} del keyring?",
        )
        answer = dialog.run()
        dialog.destroy()
        if answer != Gtk.ResponseType.OK:
            return
        self.run_task(
            lambda: f"{keyring_delete(service, account)} borrado(s)",
            f"rm {service}/{account}",
            self.refresh_secrets,
        )

    def on_list_secrets(self, _button=None):
        self.run_task(
            lambda: "\n".join(f"{s:<22}{a:<20}{label}" for s, a, label in keyring_items()),
            "list keyring",
        )

    # --- log ---------------------------------------------------------------

    def log_page(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.set_border_width(10)
        self.view = Gtk.TextView()
        self.view.set_monospace(True)
        self.view.set_editable(False)
        self.buffer = self.view.get_buffer()
        scroller = Gtk.ScrolledWindow()
        scroller.add(self.view)
        box.pack_start(scroller, True, True, 0)
        row = Gtk.Box(spacing=6)
        self.mark = Gtk.Label(label="listo", xalign=0)
        row.pack_start(self.mark, True, True, 0)
        clear = Gtk.Button(label="Limpiar")
        clear.connect("clicked", lambda *_: self.buffer.set_text(""))
        row.pack_start(clear, False, False, 0)
        box.pack_start(row, False, False, 0)
        return box


def main() -> int:
    if not MANIFEST.exists():
        sys.exit(f"no encontré {MANIFEST}")
    if not os.environ.get("DISPLAY") and not os.environ.get("WAYLAND_DISPLAY"):
        sys.exit("esto necesita sesión gráfica")
    window = Tools()
    window.connect("destroy", Gtk.main_quit)
    window.show_all()
    Gtk.main()
    return 0


if __name__ == "__main__":
    sys.exit(main())
