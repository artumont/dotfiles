return {
  "folke/trouble.nvim",
  opts = {
    modes = {},
    win = {
      type = "float",
      border = "rounded",
      title = " Diagnostics ",
      title_pos = "center",
      size = { width = 0.6, height = 0.6 },
    },
    focus = true,
    keys = {
      ["<cr>"] = "jump_close",
      ["<esc>"] = "close",
    },
  },
}
