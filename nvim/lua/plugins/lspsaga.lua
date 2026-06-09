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
      rename = {
        in_select = true,
        auto_save = true,
        keys = {
          quit = "<Esc>",
        },
      },
      hover = {
        open_link = "gx",
        max_width = 0.6,
      },
      diagnostic = {
        show_code_action = true,
        jump_num_shortcut = true,
        max_width = 0.6,
      },
      code_action = {
        num_shortcut = true,
        show_server_name = true,
        extend_gitsigns = false,
        keys = {
          quit = "<Esc>",
          exec = "<CR>",
        },
      },
    },
    config = function(_, opts)
      require("lspsaga").setup(opts)

      local map = vim.keymap.set
      map("n", "fd", "<cmd>Lspsaga hover_doc<CR>", { silent = true, desc = "Hover documentation" })
      map("n", "gr", "<cmd>Lspsaga rename<CR>", { silent = true, desc = "Rename symbol" })
      map("n", "ga", "<cmd>Lspsaga code_action<CR>", { silent = true, desc = "Code actions" })
    end,
  },
}
