require("lazy").setup({
  spec = {
    { import = "plugins" },
    { import = "themes" },
  },
  install = { colorscheme = { "tokyonight" } },
  checker = {
    enabled = true,
    notify = false,
  },
  performance = {
    rtp = {
      disabled_plugins = {
        "gzip",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})

vim.cmd.colorscheme "tokyonight"

