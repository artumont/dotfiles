return {
  {
    "nvim-treesitter/nvim-treesitter",
    lazy = false,
    build = ":TSUpdate",
    config = function()
      require("nvim-treesitter.config").setup {
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
      }
    end,
  },
}
