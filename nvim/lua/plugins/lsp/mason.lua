return {
  {
    "williamboman/mason.nvim",
    opts = {
      ensure_installed = { "lua_ls" },
    },
  },
  {
    "williamboman/mason-lspconfig.nvim",
    dependencies = { "williamboman/mason.nvim", "neovim/nvim-lspconfig" },
    opts = {
      automatic_enable = true,
    },
  },
}
