"""Pestaña de secretos: qué hay y qué falta en el keyring."""

from gi.repository import Gtk  # type: ignore[import-not-found]

from bootstrap import keyring, manifest
from bootstrap.ui.widgets import scroller, text_columns

COLUMNS = (
    (0, "Servicio", 160, False),
    (1, "Cuenta", 170, False),
    (2, "Etiqueta", 240, True),
    (3, "Estado", 110, False),
    (4, "Origen", 340, True),
)


class SecretsPage(Gtk.Box):
    def __init__(self, host):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.host = host
        self.set_border_width(10)

        self.store = Gtk.ListStore(str, str, str, str, str)
        self.view = Gtk.TreeView(model=self.store)
        text_columns(self.view, COLUMNS)
        self.pack_start(scroller(self.view), True, True, 0)

        buttons = Gtk.Box(spacing=6)
        for label, handler in (
            ("Agregar / actualizar…", self.on_set),
            ("Sembrar faltantes", self.on_seed),
            ("Borrar marcado", self.on_delete),
            ("Ver todos", self.on_list),
        ):
            button = Gtk.Button(label=label)
            button.connect("clicked", handler)
            buttons.pack_start(button, False, False, 0)
        self.pack_start(buttons, False, False, 0)

        self.status = Gtk.Label(xalign=0)
        self.pack_start(self.status, False, False, 0)
        self.refresh()

    def expected(self) -> list[tuple[str, str, str, str]] | None:
        try:
            return manifest.expected_secrets(self.host.manifest_path)
        except ValueError as error:
            self.status.set_text(str(error))
            return None

    def refresh(self):
        self.store.clear()
        expected = self.expected()
        if expected is None:
            return
        try:
            saved = keyring.items()
        except Exception as error:  # noqa: BLE001
            self.status.set_text(f"no pude abrir el keyring: {error}")
            saved = []

        declared = [(service, account) for service, account, _, _ in expected]
        present = {(service, account) for service, account, _ in saved}

        for service, account, label, source in expected:
            state = "conocido" if (service, account) in present else "falta"
            self.store.append([service, account, label, state, source])

        known = set(declared)
        unknown = [row for row in saved if (row[0], row[1]) not in known]
        for service, account, label in unknown:
            self.store.append([service, account, label, "no conocido", "-"])

        missing = sum(1 for pair in declared if pair not in present)
        self.status.set_text(
            f"{len(saved)} en el keyring, {len(present & known)} conocidos, "
            f"{len(unknown)} no conocidos, {missing} declarados sin guardar"
        )

    def selected(self) -> tuple[str, str] | None:
        model, path = self.view.get_selection().get_selected()
        if path is None:
            self.status.set_text("marca una fila primero")
            return None
        return model[path][0], model[path][1]

    def on_set(self, _button=None):
        dialog = Gtk.Dialog(title="Guardar secreto", transient_for=self.get_toplevel())
        dialog.add_buttons("Cancelar", Gtk.ResponseType.CANCEL, "Guardar", Gtk.ResponseType.OK)
        grid = Gtk.Grid(column_spacing=10, row_spacing=8, margin=12)
        dialog.get_content_area().add(grid)

        service = Gtk.Entry(text="bws-token")
        account = Gtk.Entry(text="access-token")
        value = Gtk.Entry()
        value.set_visibility(False)
        value.set_input_purpose(Gtk.InputPurpose.PASSWORD)
        value.set_placeholder_text("se guarda en el keyring, no en disco")

        fields = (("Servicio", service), ("Cuenta", account), ("Valor", value))
        for row, (label, widget) in enumerate(fields):
            grid.attach(Gtk.Label(label=label, xalign=0), 0, row, 1, 1)
            grid.attach(widget, 1, row, 1, 1)

        dialog.show_all()
        accepted = dialog.run() == Gtk.ResponseType.OK
        data = (service.get_text().strip(), account.get_text().strip(), value.get_text())
        dialog.destroy()
        if not accepted or not all(data):
            return

        def job():
            keyring.set(*data)
            return f"guardado {data[0]}/{data[1]} ({len(data[2])} bytes)"

        self.host.runner.run_task(job, f"set {data[0]}/{data[1]}", self.refresh)

    def on_seed(self, _button=None):
        expected = self.expected()
        if expected is None:
            return
        for service, account, _label, source in expected:
            try:
                if keyring.get(service, account):
                    continue
            except Exception as error:  # noqa: BLE001
                self.status.set_text(str(error))
                return
            text = self.ask_value(service, account, source)
            if text:
                self.host.runner.run_task(
                    lambda s=service, a=account, v=text: self.store_secret(s, a, v),
                    f"set {service}/{account}",
                )
        self.refresh()

    def ask_value(self, service: str, account: str, source: str) -> str:
        dialog = Gtk.Dialog(title=f"{service}/{account}", transient_for=self.get_toplevel())
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
        return text if accepted else ""

    @staticmethod
    def store_secret(service: str, account: str, value: str) -> str:
        keyring.set(service, account, value)
        return f"guardado {service}/{account}"

    def on_delete(self, _button=None):
        selected = self.selected()
        if selected is None:
            return
        service, account = selected
        dialog = Gtk.MessageDialog(
            transient_for=self.get_toplevel(),
            message_type=Gtk.MessageType.QUESTION,
            buttons=Gtk.ButtonsType.OK_CANCEL,
            text=f"¿Borrar {service}/{account} del keyring?",
        )
        answer = dialog.run()
        dialog.destroy()
        if answer != Gtk.ResponseType.OK:
            return
        self.host.runner.run_task(
            lambda: f"{keyring.delete(service, account)} borrado(s)",
            f"rm {service}/{account}",
            self.refresh,
        )

    def on_list(self, _button=None):
        self.host.runner.run_task(
            lambda: "\n".join(f"{s:<22}{a:<20}{label}" for s, a, label in keyring.items()),
            "list keyring",
        )
