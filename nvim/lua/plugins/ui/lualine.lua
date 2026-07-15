-- Statusline component

return {
  {
    "nvim-lualine/lualine.nvim",
    dependencies = { "echasnovski/mini.icons" },
    lazy = false,
    priority = 800,
    config = function()
      require("lualine").setup {
        options = {
          theme = vim.g.colors_name,
          globalstatus = true,
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
          lualine_y = { "diagnostics" },
          lualine_z = { "location" },
        },
      }
    end,
  },
}
