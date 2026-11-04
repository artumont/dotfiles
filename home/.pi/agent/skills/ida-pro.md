---
name: ida-pro
description: Use when reversing or decompiling a binary with the local IDA Pro headless setup. Covers starting the idalib-mcp server with IDADIR, connecting the ida-pro MCP tools, a driver dispatch and symbol workflow, offset and CTL_CODE arithmetic, and the failure modes that cost time.
---
Reverse with IDA Pro 9.3 + idalib through the `ida-pro` MCP server. Everything below was verified on this machine; adjust paths if the tools move.

## Start the server

The `ida-pro` MCP entry expects `http://127.0.0.1:13337/mcp`, so the server must listen there.

```sh
ss -ltn | grep -q 13337 || (
  cd "$HOME/Desktop/Tools/IDAPro/mcp" &&
  IDADIR="$HOME/Desktop/Tools/IDAPro" nohup uv run idalib-mcp --host 127.0.0.1 --port 13337 \
    > /tmp/idalib-mcp.log 2>&1 &
)
sleep 15 && tail -3 /tmp/idalib-mcp.log
```

Then `mcp({connect: "ida-pro"})`. To stop it, take the pid from `ss -ltnp` and kill that; never `pkill -f "<server cmdline>"` because the pattern matches your own shell and kills the session.

## Failure modes that cost time

| Symptom | Cause and fix |
|---|---|
| `idalib worker exited early with code 1` | `IDADIR` is not set. The worker needs `IDADIR=<ida install dir>`; without it `import idapro` raises `Cannot load IDA library file libidalib.so` |
| `mcp({connect:"ida-pro"})` says `fetch failed` | server not up yet or bound elsewhere. Start it and retry; a `405` on a plain GET is normal, streamable HTTP only answers POST |
| `Resource 'ida://idb/...' is not routable from idalib-mcp` | headless mode has no GUI resources. Use the tool form with an explicit `database=` argument |
| `data/addr must be string` | `decompile`, `disasm`, `xrefs_to` take a string address, not `["0x..."]` and not a number |
| stale diagnostics after editing a stub header | re-probe with `lens_diagnostics(source="lsp", paths=[...])` before changing code |
| `.i64`/`.id0`/`.id1`/`.nam`/`.til` files appearing in a repo | `idb_open` writes the database next to the sample. Add them to that folder's `.gitignore` |

`idb_open` returns `session_id`; every later call needs `database=<session_id>`.

## Session start

```text
idb_open(input_path="/abs/path/sample.bin", run_auto_analysis=true, init_hexrays=true, build_caches=true)
```

Check `auto_analysis_ready` and `hexrays_ready` in the response before trusting output. `survey_binary(detail_level="compact")` gives segments, entrypoints, strings, and candidate functions in one call, which is usually enough to pick targets.

## Reversing workflow

1. **Orient.** `survey_binary` for segments, entrypoints, imports and named strings. Imports tell you what the binary can do before you read a single branch.
2. **Entry path.** Decompile the entrypoint, then the functions it calls. `xrefs_to` and `callees` let you walk down without dumping whole functions.
3. **Dispatch or jump table.** Decompile the dispatcher, map every branch to its handler, and decompile each interesting callee. The primitive you want is usually one branch, not the whole dispatcher.
4. **Layouts.** Byte offsets come straight from struct arithmetic: `*(_QWORD *)(a1 + 12)` is offset 12 in the pointer's target, `*(_DWORD *)(a1 + 28)` is offset 28. Record every field with width and meaning, then check the total against the smallest sane input size. Unaligned layouts are common, so mirror them with `#pragma pack(push, 1)` and a `static_assert(sizeof(...) == N)` in C++.
5. **Constants.** Compare sites are the ground truth. Read `cmp`/`switch` constants, not a raw immediate scan; a scan also matches hashing and division magic and misses values held in registers or tables.
6. **Label as you go.** `rename`, `set_comments`, `declare_type`, `set_type`, `add_bookmark`, then `idb_save`. The next session inherits the understanding instead of re-deriving it.

## Windows kernel driver specifics

- **Device and symlink.** In the `IoCreateDevice` caller, argument 3 is the device name, 4 is `DeviceType`, 5 is `DeviceCharacteristics` (flags). `IoCreateSymbolicLink` target is the userspace path: `\DosDevices\X` -> `\\.\X`. `FILE_DEVICE_SECURE_OPEN` (0x100) in the flags means the device ACL applies, so opening may need admin.
- **Dispatch table.** `DriverObject->MajorFunction` starts at `DriverObject + 0x70`, one qword per index: `0 CREATE`, `2 CLOSE`, `3 READ`, `4 WRITE`, `14 DEVICE_CONTROL`. Decompiled code shows it as `a1[14 + i]`, so `a1[18]` is WRITE and `a1[28]` (0xE0) is DEVICE_CONTROL; `a1[13]` (0x68) is `DriverUnload`. A `memset64(a1 + 14, handler, count)` fills every slot at once, and compilers often also set index 15 to the same handler.
- **IOCTL code.** In the DEVICE_CONTROL handler, `*(_DWORD *)(*(_QWORD *)(irp + 0xB8) + 0x18)` is `CurrentStackLocation->Parameters.DeviceIoControl.IoControlCode`. The compared immediate is the code. A `switch` means read every case.
- **Buffers.** `SystemBuffer` is `*(_QWORD *)(irp + 0x18)` for buffered methods. For METHOD_NEITHER the handler reads `Type3InputBuffer` (stack location `+0x20`) and must probe it. A handler that calls `ProbeForRead` on a field taken out of `SystemBuffer` is dereferencing a caller supplied raw pointer.

## CTL_CODE decoding

`CTL_CODE(DeviceType, Function, Method, Access) = (DeviceType << 16) | (Access << 14) | (Function << 2) | Method`

```python
code & 3              # Method: 0 buffered, 1 in direct, 2 out direct, 3 neither
(code >> 14) & 3      # Access
(code >> 2) & 0xFFF   # Function
(code >> 16) & 0xFFFF # DeviceType, 0x22 is FILE_DEVICE_UNKNOWN
```

Use `int_convert` or `python3 -c` for the arithmetic. Base conversions done mentally are the most common source of wrong codes in a report.

## Tool cheat sheet

| Goal | Tool |
|---|---|
| Big picture, segments, strings, suspects | `survey_binary` |
| Pseudocode for a list of addresses | `decompile` (set `include_addresses=false` to save tokens) |
| Instruction level detail | `disasm`, `analyze_function` |
| Who calls this, what it calls | `xrefs_to`, `callees`, `callgraph` |
| Find a constant use | `find(type="immediates", targets=[...])`, `insn_query` |
| Find strings | `find_regex`, `search_text`, `get_string` |
| Read raw bytes or globals | `get_bytes`, `get_int`, `get_global_value` |
| Confirm a struct layout | `declare_type`, `set_type`, `read_struct`, `type_inspect` |
| Label what you found | `rename`, `set_comments`, `add_bookmark`, then `idb_save` |
| Anything not covered | `py_eval` / `py_exec_file` run real IDAPython, e.g. a dump loop over `XrefsTo` |

## Verify before reporting

- Arithmetic checked with a tool, not mentally.
- Every claimed offset appears in decompiled code as `*(type *)(base + N)`.
- Any constant you quote was read at the comparison site.
- Struct size equals the largest field end, and the request you emit passes `static_assert`.
- Generated databases stay out of version control; the analysis notes are what you keep.
