-- MasonLsp config and ensured packages

local mason_util = require "utils.mason"

return {
  {
    "mason-org/mason.nvim",
    opts = {
      ensure_installed = {
        "tree-sitter-cli",
        "vale",
      },
    },
  },
  {
    "mason-org/mason-lspconfig.nvim",
    dependencies = { "mason-org/mason.nvim", "neovim/nvim-lspconfig" },
    opts = {
      automatic_enable = false,
    },
  },
  {
    "neovim/nvim-lspconfig",
    dependencies = { "mason-org/mason-lspconfig.nvim" },
    config = function()
      local ok, blink = pcall(require, "blink.cmp")
      local cap = ok and blink.get_lsp_capabilities() or vim.lsp.protocol.make_client_capabilities()

      vim.lsp.config("*", { capabilities = cap })

      local langs = mason_util.list_langs()
      local enabled = {}
      for _, lang in ipairs(langs) do
        for name, cfg in pairs(lang.lsp) do
          vim.lsp.config(name, cfg)
          table.insert(enabled, name)
        end
      end

      vim.lsp.enable(enabled)
    end,
  },
}
