-- Collection of small QOL plugins (dashboard, notifier, picker, etc.)

return {
  "folke/snacks.nvim",
  lazy = false,
  opts = {
    bigfile = { enabled = true },
    dashboard = {
      sections = {
        { section = "header" },
        { section = "keys", gap = 1, padding = 1 },
      },
      preset = {
        keys = {
          { icon = " ", key = "f", desc = "Find File", action = ":lua Snacks.dashboard.pick('files')" },
          { icon = " ", key = "a", desc = "New File", action = ":ene | startinsert" },
          { icon = " ", key = "g", desc = "Find Text", action = ":lua Snacks.dashboard.pick('live_grep')" },
          { icon = " ", key = "r", desc = "Recent Files", action = ":lua Snacks.dashboard.pick('oldfiles')" },
          { icon = " ", key = "s", desc = "Restore Session", section = "session" },
          { icon = " ", key = "q", desc = "Quit", action = ":qa" },
        },
      },
    },
    input = { enabled = true },
    animate = { enabled = true },
    bufdelete = { enabled = true },
    gh = { enabled = true },
    image = { enabled = true },
    indent = { enabled = true },
    keymaps = { enabled = true },
    lazygit = { configure = true },
    notifier = { enabled = true },
    picker = { enabled = true },
    scroll = { enabled = true },
  },
}
