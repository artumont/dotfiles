return {
  {
    "neovim/nvim-lspconfig",
    config = function()
      vim.lsp.config("basedpyright", {
        settings = {
          basedpyright = {
            analysis = {
              typeCheckingMode = "standard",
              diagnosticMode = "openFilesOnly",
              useLibraryCodeForTypes = true,
              autoImportCompletions = true,
            },
            inlayHints = {
              variableTypes = false,
              functionReturnTypes = false,
              callArgumentNames = false,
              genericTypes = false,
            },
          },
        },
      })
    end,
  },
}
