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
      hover = {
        open_link = "gx",
        max_width = 0.6,
      },
      diagnostic = {
        show_code_action = true,
        jump_num_shortcut = true,
        max_width = 0.6,
      },
    },
    config = function(_, opts)
      require("lspsaga").setup(opts)

      local map = vim.keymap.set
      map("n", "K", "<cmd>Lspsaga hover_doc<CR>", { silent = true, desc = "Hover Doc" })
      map("n", "gl", "<cmd>Lspsaga show_line_diagnostics<CR>", { silent = true, desc = "Line Diagnostics" })
    end,
  },
}

