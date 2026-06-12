return {
  {
    "nvim-treesitter/nvim-treesitter",
    lazy = false,
    build = ":TSUpdate",
    opts = {
      ensure_installed = {
        "lua",
        "python",
        "javascript",
        "typescript",
        "json",
        "yaml",
        "toml",
        "markdown",
        "bash",
      },
      auto_install = true,
      indent = {
        enabled = false,
      },
    },
  },
}
