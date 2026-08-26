-- Bufferline

return {
  "akinsho/bufferline.nvim",
  event = "VeryLazy",
  dependencies = { "nvim-mini/mini.icons" },
  opts = {
    options = {
      offsets = {
        {
          filetype = "neo-tree",
          text = "",
          highlight = "Directory",
          text_align = "left",
          separator = true,
        },
        {
          filetype = "neo-tree-git",
          text = "",
          highlight = "Directory",
          text_align = "left",
          separator = true,
        },
      },
      diagnostics = "nvim_lsp",
      close_command = function(buf) Snacks.bufdelete(buf) end,
      get_element_icon = function(element)
        local ok, mini = pcall(require, "mini.icons")
        if not ok then return end
        return mini.get("filetype", element.filetype)
      end,
    },
  },
}
