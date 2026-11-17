"""Acceso al keyring de GNOME por Secret Service."""

import secretstorage


def session():
    bus = secretstorage.dbus_init()
    collection = secretstorage.get_default_collection(bus)
    if collection.is_locked():
        raise RuntimeError("el keyring está bloqueado: desbloquéalo en el escritorio")
    return secretstorage, bus, collection


def get(service: str, account: str) -> bytes | None:
    secretstorage, bus, _ = session()
    items = list(secretstorage.search_items(bus, {"service": service, "account": account}))
    return items[0].get_secret() if items else None


def set(service: str, account: str, value: str, label: str = "") -> None:
    _, _, collection = session()
    collection.create_item(
        label or f"{service}/{account}",
        {"service": service, "account": account},
        value.encode(),
        replace=True,
    )


class Item:
    """Item del keyring; conserva el handle para poder borrarlo tal cual."""

    def __init__(self, handle):
        self.handle = handle
        attrs = handle.get_attributes()
        self.service = attrs.get("service", "")
        self.account = attrs.get("account", "")
        self.label = handle.get_label()

    def delete(self) -> None:
        self.handle.delete()

    def display(self) -> tuple[str, str]:
        return self.service or "-", self.account or "-"


def items() -> list[Item]:
    _, _, collection = session()
    return sorted((Item(handle) for handle in collection.get_all_items()), key=lambda i: (i.service, i.account))
