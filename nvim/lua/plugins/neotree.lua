return {
  {
    "nvim-neo-tree/neo-tree.nvim",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "MunifTanjim/nui.nvim",
      "nvim-tree/nvim-web-devicons",
    },
    opts = {
      window = {
        -- position = "left",
        -- width = 30,
        mappings = {
          ["<bs>"] = "noop",
          ["<space>"] = "noop",
        },
      },
      event_handlers = {},
      filesystem = {
        hijack_netrw_behavior = "disabled",
        filtered_items = {
          visible = false,
          hide_dotfiles = false,
          hide_gitignored = false,
          hide_hidden = false,
          show_hidden_count = false,
          hide_by_name = {
            ".DS_Store",
            "thumbs.db",
            "node_modules",
            "__pycache__",
            ".git",
          },
        },
      },
      source_selector = {
        winbar = false,
        -- sources = {
        --   { source = "filesystem" },
        --   { source = "git_status" },
        -- },
      },
    },
  },
}
