return {
  {
    "akinsho/bufferline.nvim",
    event = "VeryLazy",
    dependencies = { "echasnovski/mini.icons" },
    opts = function()
      local Offset = require "bufferline.offset"
      if not Offset.edgy then
        local get = Offset.get
        Offset.get = function()
          if package.loaded.edgy then
            local layout = require("edgy.config").layout
            local ret = { left = "", left_size = 0, right = "", right_size = 0 }
            for _, pos in ipairs { "left", "right" } do
              local sb = layout[pos]
              if sb and #sb.wins > 0 then
                local title = "       " .. string.rep(" ", sb.bounds.width - 8)
                ret[pos] = "%#EdgyTitle#" .. title .. "%*" .. "%#WinSeparator#│%*"
                ret[pos .. "_size"] = sb.bounds.width
              end
            end
            ret.total_size = ret.left_size + ret.right_size
            if ret.total_size > 0 then return ret end
          end
          return get()
        end
        Offset.edgy = true
      end

      return {
        options = {
          diagnostics = "nvim_lsp",
          close_command = function(bufnr) Snacks.bufdelete(bufnr) end,
          custom_filter = function(buf) return vim.fn.bufname(buf) ~= "" end,
          indicator = { style = "none" },
          show_buffer_close_icons = true,
          show_close_icon = false,
          separator_style = "thin",
          close_icon = "󰅖",
          buffer_close_icon = "󰅖",
          get_element_icon = function(element)
            local ok, mini = pcall(require, "mini.icons")
            if not ok then return end
            return mini.get("filetype", element.filetype)
          end,
        },
      }
    end,
  },
}
