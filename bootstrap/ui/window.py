"""Ventana principal: arma las pestañas y comparte el runner."""

from pathlib import Path

from gi.repository import Gtk  # type: ignore[import-not-found]

from bootstrap.ui.icons import IconsPage
from bootstrap.ui.links import LinksPage
from bootstrap.ui.log import LogPage
from bootstrap.ui.runner import Runner
from bootstrap.ui.secrets import SecretsPage


class ToolsWindow(Gtk.Window):
    def __init__(self, root: Path, manifest_path: Path):
        super().__init__(title="Dotfiles manager")
        self.root = root
        self.manifest_path = manifest_path
        self.set_default_size(1060, 680)
        self.set_size_request(720, 480)

        header = Gtk.HeaderBar()
        header.set_show_close_button(True)
        header.props.title = "Dotfiles"
        header.props.subtitle = str(root)
        self.set_titlebar(header)

        self.log_page = LogPage()
        self.runner = Runner(root, self.log_page.append)

        notebook = Gtk.Notebook()
        for page, title in (
            (LinksPage(self), "Vínculos"),
            (IconsPage(self), "Iconos"),
            (SecretsPage(self), "Secretos"),
            (self.log_page, "Log"),
        ):
            notebook.append_page(page, Gtk.Label(label=title))
        self.add(notebook)
