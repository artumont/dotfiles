return {
  {
    "nvim-neo-tree/neo-tree.nvim",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "MunifTanjim/nui.nvim",
      "nvim-mini/mini.icons",
    },
    lazy = false,
    opts = {
      use_popups_for_input = true,
      popup_border_style = "rounded",
      window = {
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
      },
      default_component_configs = {
        icon = {
          provider = function(icon, node)
            local text, hl
            local mini_icons = require "mini.icons"
            if node.type == "file" then
              text, hl = mini_icons.get("file", node.name)
            elseif node.type == "directory" then
              text, hl = mini_icons.get("directory", node.name)
              if node:is_expanded() then text = nil end
            end

            if text then icon.text = text end
            if hl then icon.highlight = hl end
          end,
        },
        kind_icon = {
          provider = function(icon, node)
            icon.text, icon.highlight = require("mini.icons").get("lsp", node.extra.kind.name)
          end,
        },
      },
    },
  },
}
