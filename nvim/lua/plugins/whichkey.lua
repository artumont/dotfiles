return {
  "folke/which-key.nvim",
  event = "VeryLazy",
  opts = {
    spec = {
      { "<leader>E", icon = "󰙅" },
      { "<leader>b", icon = "", desc = "Buffer Actions" },
      { "l", icon = "󰈮", desc = "Lsp Actions" },
      { "<leader>x", icon = "", desc = "Trouble Actions" },
      { "<leader>g", icon = "", desc = "Git Actions" },
      { "<leader>9", icon = "", desc = "99Agent Actions" },
    },
  },
}
