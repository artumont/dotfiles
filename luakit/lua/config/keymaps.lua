local modes = require "modes"
local window = require "window"

-- ── Leader ────────────────────────────────────────────────────────────────

modes.remove_binds("normal", { "<space>" })
modes.add_binds("normal", {
  {
    "<space>",
    "Open which-key.",
    function(w) require("which-key").open(w) end,
  },
})

-- Existing windows cached normal-mode binds during system rc.lua startup.
for _, w in pairs(window.bywidget) do
  if w:is_mode "normal" then w:update_binds "normal" end
end
