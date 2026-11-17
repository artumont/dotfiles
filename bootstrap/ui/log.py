"""Pestaña de log: la salida de cada acción."""

from gi.repository import Gtk  # type: ignore[import-not-found]

from bootstrap.ui.widgets import scroller


class LogPage(Gtk.Box):
    def __init__(self):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.set_border_width(10)

        self.view = Gtk.TextView()
        self.view.set_monospace(True)
        self.view.set_editable(False)
        self.buffer = self.view.get_buffer()
        self.pack_start(scroller(self.view), True, True, 0)

        row = Gtk.Box(spacing=6)
        self.mark = Gtk.Label(label="listo", xalign=0)
        row.pack_start(self.mark, True, True, 0)
        clear = Gtk.Button(label="Limpiar")
        clear.connect("clicked", lambda *_: self.buffer.set_text(""))
        row.pack_start(clear, False, False, 0)
        self.pack_start(row, False, False, 0)

    def append(self, text: str, code: int | None = None):
        end = self.buffer.get_end_iter()
        self.buffer.insert(end, text.rstrip() + "\n\n")
        if code is not None:
            self.mark.set_text("ok" if code == 0 else f"exit {code}")
        self.view.scroll_to_iter(self.buffer.get_end_iter(), 0.0, False, 0.0, 0.0)
