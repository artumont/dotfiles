"""Pestaña de vínculos: estado del manifest e instalación."""

import sys

from gi.repository import Gtk, Pango  # type: ignore[import-not-found]

from bootstrap import manifest
from bootstrap.ui.widgets import scroller, text_columns

COLUMNS = (
    (1, "Nombre", 200, False),
    (2, "Origen", 320, True),
    (3, "Destino", 320, True),
    (4, "Estado", 220, False),
)


class LinksPage(Gtk.Box):
    def __init__(self, host):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.host = host
        self.set_border_width(10)

        self.store = Gtk.ListStore(bool, str, str, str, str)
        view = Gtk.TreeView(model=self.store)
        toggle = Gtk.CellRendererToggle()
        toggle.connect("toggled", self.on_toggle)
        view.append_column(Gtk.TreeViewColumn("", toggle, active=0))
        text_columns(view, COLUMNS, ellipsize=Pango.EllipsizeMode.MIDDLE)
        self.pack_start(scroller(view), True, True, 0)

        buttons = Gtk.Box(spacing=6)
        for label, handler in (
            ("Recargar", lambda *_: self.refresh()),
            ("Instalar marcados", self.on_install),
            ("Dry run", self.on_dry_run),
            ("Safe pull", self.on_pull),
            ("Agregar…", self.on_add_entry),
        ):
            button = Gtk.Button(label=label)
            button.connect("clicked", handler)
            buttons.pack_start(button, False, False, 0)
        self.pack_start(buttons, False, False, 0)

        self.status = Gtk.Label(xalign=0)
        self.pack_start(self.status, False, False, 0)
        self.refresh()

    def entries(self) -> tuple[list[dict], str | None]:
        try:
            return manifest.read(self.host.manifest_path).get("links", []), None
        except ValueError as error:
            return [], str(error)

    def refresh(self):
        entries, error = self.entries()
        self.store.clear()
        if error:
            self.status.set_text(error)
            return
        for entry in entries:
            state = manifest.link_state(entry, self.host.root)
            self.store.append([False, entry["name"], entry["source"], entry["dest"], state])
        linked = sum(1 for entry in entries if manifest.link_state(entry, self.host.root) == "enlazado")
        self.status.set_text(f"{len(entries)} entradas, {linked} enlazadas")

    def marked(self) -> list[str]:
        return [row[1] for row in self.store if row[0]]

    def install_command(self, *extra: str) -> list[str]:
        cmd = [sys.executable, "-m", "bootstrap.install", *extra]
        for name in self.marked():
            cmd += ["--only", name]
        return cmd

    def on_toggle(self, _renderer, path):
        self.store[path][0] = not self.store[path][0]

    def on_install(self, _button=None):
        self.host.runner.run_async(self.install_command(), self.refresh)

    def on_dry_run(self, _button=None):
        self.host.runner.run_async(self.install_command("--dry-run"))

    def on_pull(self, _button=None):
        self.host.runner.run_async([sys.executable, "-m", "bootstrap.pull", "--yes"], self.refresh)

    def on_add_entry(self, _button=None):
        try:
            candidates = [str(path) for path in manifest.list_candidates(self.host.manifest_path)]
        except Exception:  # noqa: BLE001
            candidates = []

        dialog = Gtk.Dialog(title="Agregar al manifest", transient_for=self.get_toplevel())
        dialog.add_buttons("Cancelar", Gtk.ResponseType.CANCEL, "Agregar", Gtk.ResponseType.OK)
        grid = Gtk.Grid(column_spacing=10, row_spacing=8, margin=12)
        dialog.get_content_area().add(grid)

        name_entry = Gtk.Entry()
        source_combo = Gtk.ComboBoxText.new_with_entry()
        for candidate in candidates:
            source_combo.append_text(candidate)
        dest_entry = Gtk.Entry()
        dest_entry.set_placeholder_text("~/.config/algo")

        fields = (("Nombre", name_entry), ("Origen", source_combo), ("Destino", dest_entry))
        for row, (label, widget) in enumerate(fields):
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

        entries, error = self.entries()
        if error:
            self.status.set_text(error)
            return
        if any(entry["source"] == source for entry in entries):
            self.status.set_text(f"{source} ya está en el manifest")
            return
        entries.append({"name": name, "source": source, "dest": dest})
        try:
            manifest.save_links(self.host.manifest_path, entries)
        except ValueError as error:
            self.status.set_text(str(error))
            return
        self.refresh()
        self.host.runner.run_async([sys.executable, "-m", "bootstrap.install", "--only", name], self.refresh)
