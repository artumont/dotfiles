-- Statusline component

return {
  {
    "nvim-lualine/lualine.nvim",
    dependencies = { "echasnovski/mini.icons" },
    lazy = false,
    priority = 800,
    config = function()
      local function agent_smith_status()
        local ok, smith = pcall(require, "agent-smith")
        if not ok or type(smith.statusline) ~= "function" then return "" end

        local status_ok, text = pcall(smith.statusline)
        if not status_ok or type(text) ~= "string" then return "" end
        return text
      end

      local function agent_smith_color()
        local ok, smith = pcall(require, "agent-smith")
        if ok and type(smith.statusline_color) == "function" then
          local color_ok, color = pcall(smith.statusline_color)
          if color_ok and color then return color end
        end
        return { fg = "#e0af68" }
      end

      require("lualine").setup {
        options = {
          theme = vim.g.colors_name,
          globalstatus = true,
          refresh = { statusline = 70 },
          component_separators = "",
          section_separators = "",
        },
        sections = {
          lualine_a = { "mode" },
          lualine_b = { "branch" },
          lualine_c = {
            {
              function()
                local ok, mini_icons = pcall(require, "mini.icons")
                if not ok then return vim.fn.expand "%:t" end
                local icon, hl = mini_icons.get("filetype", vim.bo.filetype)
                local name = vim.fn.expand "%:t"
                return "%#" .. hl .. "#" .. icon .. "%* " .. name
              end,
            },
          },
          lualine_x = {
            {
              agent_smith_status,
              cond = function() return agent_smith_status() ~= "" end,
              color = agent_smith_color,
            },
          },
          lualine_y = { "diagnostics" },
          lualine_z = { "location" },
        },
      }
    end,
  },
}
