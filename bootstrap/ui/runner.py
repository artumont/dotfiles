"""Tareas en hilo, con la salida escrita en el log."""

import subprocess
import threading
from collections.abc import Callable
from pathlib import Path

from gi.repository import GLib  # type: ignore[import-not-found]


class Runner:
    def __init__(self, root: Path, log: Callable[[str, int | None], None]):
        self.root = root
        self.log = log

    def run_async(self, cmd, on_done=None):
        def worker():
            try:
                proc = subprocess.run(
                    [str(part) for part in cmd],
                    cwd=str(self.root),
                    capture_output=True,
                    text=True,
                    timeout=900,
                    check=False,
                )
                out = (proc.stdout or "") + (proc.stderr or "")
                code = proc.returncode
            except Exception as error:  # noqa: BLE001
                out, code = f"error: {error}", 1
            GLib.idle_add(self._finished, f"$ {' '.join(str(c) for c in cmd)}\n{out}", code, on_done)

        threading.Thread(target=worker, daemon=True).start()

    def run_task(self, job, label, on_done=None):
        def worker():
            try:
                out, code = job(), 0
            except Exception as error:  # noqa: BLE001
                out, code = f"error: {error}", 1
            GLib.idle_add(self._finished, f"$ {label}\n{out or ''}", code, on_done)

        threading.Thread(target=worker, daemon=True).start()

    def _finished(self, text, code, on_done):
        self.log(text, code)
        if on_done:
            on_done()
        return False
