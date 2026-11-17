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


def delete(service: str, account: str) -> int:
    secretstorage, bus, _ = session()
    items = list(secretstorage.search_items(bus, {"service": service, "account": account}))
    for item in items:
        item.delete()
    return len(items)


def items() -> list[tuple[str, str, str]]:
    _, _, collection = session()
    rows = []
    for item in collection.get_all_items():
        attrs = item.get_attributes()
        rows.append((attrs.get("service", "-"), attrs.get("account", "-"), item.get_label()))
    return sorted(rows)
