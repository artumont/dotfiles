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
      { "<leader>d", icon = "", desc = "Debugger Actions" },
      { "<leader>e", icon = "󰙅", desc = "Neotree Actions" },
      { "<leader>g", icon = "", desc = "Git Actions" },
      { "<leader>x", icon = "", desc = "Trouble Actions" },
      { "<leader>b", icon = "", desc = "Buffer Actions" },
      { "<leader>s", icon = "", desc = "Search Methods" },
      { "<leader>k", icon = "", desc = "Docker Actions" },
    },
  },
}
