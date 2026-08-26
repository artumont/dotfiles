-- File explorer sidebar

return {
  "nvim-neo-tree/neo-tree.nvim",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
    "nvim-mini/mini.icons",
  },
  lazy = false,
  opts = {
    window = {
      mappings = {
        ["<bs>"] = "noop",
        ["<space>"] = "noop",
      },
    },
    filesystem = {
      use_libuv_file_watcher = true,
      hijack_netrw_behavior = "disabled",
      filtered_items = {
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
    },
  },
}
