return {
  "Saghen/blink.cmp",
  version = "1.*",
  dependencies = { "rafamadriz/friendly-snippets" },
  opts = {
    enabled = function() return not vim.tbl_contains({ "neo-tree", "neo-tree-popup", "toggleterm" }, vim.bo.filetype) end,
    cmdline = {
      enabled = true,
      completion = {
        menu = { auto_show = true },
      },
      keymap = {
        preset = "super-tab",
        ["<C-y>"] = {},
      },
    },
  },
}
