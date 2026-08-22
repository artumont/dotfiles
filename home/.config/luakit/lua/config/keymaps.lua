local modes = require "modes"
local window = require "window"
local globals = require "config.globals"

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

-- ── Keybind mapping ──────────────────────────────────────────────────────────

return {
  { "<leader>t", group = true, icon = " ", desc = "Tab" },
  {
    "<leader>t.n",
    icon = "",
    desc = "New Tab",
    action = function(w)
      w:new_tab()
      w:navigate(globals.default_page)
    end,
  },
  { "<leader>t.d", icon = "", desc = "Close Tab", action = function(w) w:close_tab() end },
  {
    "<leader>t.D",
    icon = "",
    desc = "New Tab (Close Others)",
    action = function(w)
      w:new_tab(globals.default_page, { switch = true })
      local keep = w.view
      local to_close = {}
      for _, view in ipairs(w.tabs.children) do
        if view ~= keep then table.insert(to_close, view) end
      end
      for _, view in ipairs(to_close) do
        w:close_tab(view)
      end
    end,
  },
  { "<leader>t.h", icon = "", desc = "Previous Tab", action = function(w) w:prev_tab() end },
  { "<leader>t.l", icon = "", desc = "Next Tab", action = function(w) w:next_tab() end },
  { "<leader>p", group = true, icon = "", desc = "PowerScripts" },
  { "<leader>p.d", group = true, icon = "", desc = "DarkMode" },
  {
    "<leader>p.d.t",
    icon = "",
    desc = "Toggle darkmode",
    action = function(w) w.view:eval_js("window.__darkmode_toggle && window.__darkmode_toggle()", { no_return = true }) end,
  },
  {
    "<leader>p.d.g",
    icon = "",
    desc = "Open darkmode GUI",
    action = function(w)
      w.view:eval_js("window.__darkmode_show_gui && window.__darkmode_show_gui()", { no_return = true })
    end,
  },
  {
    "<leader>p.d.e",
    icon = "",
    desc = "Enable darkmode",
    action = function(w) w.view:eval_js("window.__darkmode_enable && window.__darkmode_enable()", { no_return = true }) end,
  },
  {
    "<leader>p.d.d",
    icon = "",
    desc = "Disable darkmode",
    action = function(w)
      w.view:eval_js("window.__darkmode_disable && window.__darkmode_disable()", { no_return = true })
    end,
  },
}
