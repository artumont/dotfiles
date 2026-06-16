return {
  "folke/which-key.nvim",
  event = "VeryLazy",
  opts = {
    triggers = {
      { "<auto>", mode = "nixsotc" },
      { "l", mode = "n" },
    },
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
