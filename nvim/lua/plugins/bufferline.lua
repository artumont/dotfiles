return {
  {
    "akinsho/bufferline.nvim",
    event = "VeryLazy",
    dependencies = { "echasnovski/mini.icons" },
    opts = {
      options = {
        diagnostics = "nvim_lsp",
        close_command = function(bufnr) Snacks.bufdelete(bufnr) end,
        offsets = {
          {
            filetype = "neo-tree",
            text = "Files",
            highlight = "Directory",
            text_align = "left",
          },
        },
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
    },
  },
}
