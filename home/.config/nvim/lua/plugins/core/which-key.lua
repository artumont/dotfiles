-- Keybinding hint popup

return {
  "folke/which-key.nvim",
  event = "VeryLazy",
  opts = {
    triggers = {
      { "<auto>", mode = "nixsotc" },
      { "m", mode = "n" },
    },
    spec = {},
  },
}
