"""Pestaña de iconos: repo contra lo instalado en hicolor."""

from gi.repository import Gtk  # type: ignore[import-not-found]

from bootstrap import icons as icon
from bootstrap.ui.widgets import scroller, text_columns

REPO_COLUMNS = ((0, "Nombre", 170, False), (1, "Categoría", 130, False), (2, "Tamaño", 100, False), (3, "Tipo", 60, False))
INSTALLED_COLUMNS = ((0, "Nombre", 170, False), (1, "Categoría", 130, False), (2, "Tamaños", 220, True))


class IconsPage(Gtk.Box):
    def __init__(self, host):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.host = host
        self.set_border_width(10)

        panes = Gtk.Box(spacing=8)
        panes.pack_start(self.repo_widget(), True, True, 0)
        panes.pack_start(self.installed_widget(), True, True, 0)
        self.pack_start(panes, True, True, 0)

        buttons = Gtk.Box(spacing=6)
        for label, handler in (
            ("Recargar", lambda *_: self.refresh()),
            ("Instalar origen marcado", self.on_install),
            ("Quitar marcado", self.on_remove),
        ):
            button = Gtk.Button(label=label)
            button.connect("clicked", handler)
            buttons.pack_start(button, False, False, 0)
        self.pack_start(buttons, False, False, 0)

        self.status = Gtk.Label(xalign=0)
        self.pack_start(self.status, False, False, 0)
        self.refresh()

    def repo_widget(self) -> Gtk.Frame:
        frame = Gtk.Frame(label="En el repo (desktop/icons)")
        self.repo_store = Gtk.ListStore(str, str, str, str)
        self.repo_view = Gtk.TreeView(model=self.repo_store)
        text_columns(self.repo_view, REPO_COLUMNS)
        frame.add(scroller(self.repo_view))
        return frame

    def installed_widget(self) -> Gtk.Frame:
        frame = Gtk.Frame(label="Instalados (hicolor)")
        self.installed_store = Gtk.ListStore(str, str, str)
        self.installed_view = Gtk.TreeView(model=self.installed_store)
        text_columns(self.installed_view, INSTALLED_COLUMNS)
        frame.add(scroller(self.installed_view))
        return frame

    def refresh(self):
        self.repo_store.clear()
        self.installed_store.clear()
        try:
            sources = icon.scan_repo_icons()
        except Exception as error:  # noqa: BLE001
            self.status.set_text(f"error leyendo iconos: {error}")
            return
        for source in sources:
            dims = icon.get_image_dimensions(source.path)
            self.repo_store.append(
                [source.name, source.category, f"{dims[0]}x{dims[1]}" if dims else "?", source.path.suffix.lstrip(".")]
            )
        try:
            installed = icon.installed_icons()
        except Exception as error:  # noqa: BLE001
            self.status.set_text(f"error leyendo hicolor: {error}")
            return
        for name, categories in sorted(installed.items()):
            for category, sizes in sorted(categories.items()):
                labels = ", ".join(icon.size_label(size) for size in sorted(set(sizes)))
                self.installed_store.append([name, category, labels])
        self.status.set_text(f"{len(sources)} en el repo, {len(installed)} instalados")

    def on_install(self, _button=None):
        model, path = self.repo_view.get_selection().get_selected()
        if path is None:
            self.status.set_text("marca un icono del repo primero")
            return
        name, category = model[path][0], model[path][1]
        source = next((s for s in icon.scan_repo_icons() if s.name == name and s.category == category), None)
        if source is None:
            self.status.set_text(f"no encontré {category}/{name}")
            return
        if category == "uncategorized":
            self.status.set_text("ese icono no tiene categoría; muévelo a desktop/icons/<categoría>/")
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

        self.host.runner.run_task(job, f"instalar icono {category}/{name}", self.refresh)

    def on_remove(self, _button=None):
        model, path = self.installed_view.get_selection().get_selected()
        if path is None:
            self.status.set_text("marca un icono instalado primero")
            return
        name = model[path][0]
        dialog = Gtk.MessageDialog(
            transient_for=self.get_toplevel(),
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

        self.host.runner.run_task(job, f"quitar icono {name}", self.refresh)
