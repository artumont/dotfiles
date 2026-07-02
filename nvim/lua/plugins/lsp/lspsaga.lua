-- Enhanced LSP UI (code actions, rename, winbar symbols)

return {
  {
    "nvimdev/lspsaga.nvim",
    event = "LspAttach",
    dependencies = {
      "nvim-treesitter/nvim-treesitter",
      "nvim-tree/nvim-web-devicons",
    },
    opts = {
      ui = {
        border = "rounded",
        devicon = true,
      },
      symbol_in_winbar = {
        enable = true,
      },
      code_action = {
        enable = true,
        keys = {
          quit = "<Esc>",
        },
      },
      implement = {
        enable = true,
      },
      lightbulb = {
        enable = false,
      },
      rename = {
        enable = true,
        auto_save = true,
        keys = {
          quit = "<Esc>",
        },
      },
    },
    config = function(_, opts) require("lspsaga").setup(opts) end,
  },
}
