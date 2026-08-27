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
        ["<cr>"] = "smart_open",
        ["o"] = "smart_open",
        ["s"] = "smart_split",
        ["v"] = "smart_vsplit",
        ["<2-LeftMouse>"] = "noop",
      },
    },
    commands = {
      smart_pick = function(state, picker_cmd, fallback_cmd)
        local win_count = 0
        for _, winid in ipairs(vim.api.nvim_list_wins()) do
          local cfg = vim.api.nvim_win_get_config(winid)
          local buf = vim.api.nvim_win_get_buf(winid)
          local ft = vim.bo[buf].filetype

          if cfg.relative == "" and not ft:match "^neo%-tree" then win_count = win_count + 1 end
        end

        if win_count <= 1 then
          state.commands[fallback_cmd](state)
        else
          local ok = pcall(state.commands[picker_cmd], state)
          if not ok then state.commands[fallback_cmd](state) end
        end
      end,

      smart_open = function(state) state.commands.smart_pick(state, "open_with_window_picker", "open") end,
      smart_split = function(state) state.commands.smart_pick(state, "split_with_window_picker", "split") end,
      smart_vsplit = function(state) state.commands.smart_pick(state, "vsplit_with_window_picker", "vsplit") end,
    },
    filesystem = {
      use_libuv_file_watcher = true,
      hijack_netrw_behavior = "disabled",
      filtered_items = {
        show_hidden_count = false,
        hide_dotfiles = false,
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
  config = function(_, opts)
    local function on_move(data) Snacks.rename.on_rename_file(data.source, data.destination) end
    local events = require "neo-tree.events"
    opts.event_handlers = opts.event_handlers or {}
    vim.list_extend(opts.event_handlers, {
      { event = events.FILE_MOVED, handler = on_move },
      { event = events.FILE_RENAMED, handler = on_move },
    })
    require("neo-tree").setup(opts)
  end,
}
