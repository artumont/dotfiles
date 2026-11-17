"""Helpers para armar tablas GTK."""

from gi.repository import Gtk, Pango  # type: ignore[import-not-found]


def text_columns(view, columns, ellipsize=Pango.EllipsizeMode.END):
    """Agrega columnas de texto: (índice del modelo, título, ancho mínimo, expandir)."""
    for index, title, width, expand in columns:
        renderer = Gtk.CellRendererText()
        renderer.set_property("ellipsize", ellipsize)
        column = Gtk.TreeViewColumn(title, renderer, text=index)
        column.set_min_width(width)
        column.set_resizable(True)
        column.set_expand(expand)
        view.append_column(column)


def scroller(child) -> Gtk.ScrolledWindow:
    area = Gtk.ScrolledWindow()
    area.add(child)
    return area
