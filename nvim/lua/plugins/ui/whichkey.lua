-- Keybinding hint popup

return {
  "folke/which-key.nvim",
  event = "VeryLazy",
  opts = {
    triggers = {
      { "<auto>", mode = "nixsotc" },
      { "m", mode = "n" },
    },
    spec = {
      { "<leader>E", icon = "󰙅" },
      { "<leader>b", icon = "", desc = "Buffer Actions" },
      { "m", icon = "󰈮", desc = "Lsp Actions" },
      { "<leader>x", icon = "", desc = "Trouble Actions" },
      { "<leader>g", icon = "", desc = "Git Actions" },
      { "<leader>9", icon = "", desc = "99Agent Actions" },
      { "<leader>R", icon = "", desc = "ESP idf Actions" },
    },
  },
}
