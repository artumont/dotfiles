return {
  "artumont/which-key.luakit",
  module = "which-key",
  config = true,
  main = "which-key",
  opts = {
    behaviour = {
      discover = false,
      bind_leader = false,
    },
    spec = {
      { "<leader>t", group = true, icon = " ", desc = "Tab" },
      { "<leader>t.n", icon = "", desc = "New Tab",     action = function(w) w:new_tab() end },
      { "<leader>t.c", icon = "", desc = "Close Tab",   action = function(w) w:close_tab() end },
      { "<leader>t.h", icon = "", desc = "Previous Tab", action = function(w) w:prev_tab() end },
      { "<leader>t.l", icon = "", desc = "Next Tab",    action = function(w) w:next_tab() end },
    },
  },
}
