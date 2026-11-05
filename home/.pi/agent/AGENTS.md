# Firefox MCP and Google Docs

Docs renders the body to a canvas, so the docs tools type at the caret with real
key events. Text lands wherever the caret is, not where I assume it is.

Before any edit:
1. Run `docs status` and then `docs cursor find="<text>"` so the caret position
   is confirmed by the tool output, not guessed.
2. Never assume the caret is outside a table. `docs insert` and `docs text`
   inside a table cell write into that cell and can add rows, mangling the
   layout. To start below a table, click the page area under it first.
3. Do not press Tab to move around: in Docs it switches table cells.
4. Verify with `docs check` after the first write of a batch, not after the whole
   batch, and stop if it looks wrong instead of continuing. `docs check`
   returns the whole document collapsed to one line, which is enough to see
   whether text landed where intended and costs far less than a screenshot.
5. `Ctrl+Z` is not a safe repair here: it undoes earlier good work too. Fix a
   bad write by finding and selecting the junk text, or ask first.

To append an answer to an existing line, use `docs cursor find="<line>"` with
`where=end` and then `docs text`.
