return {
  "AstroNvim/astrolsp",
  ---@type AstroLSPOpts
  opts = {
    config = {
      basedpyright = {
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
      },
    },
    diagnostics = {
      virtual_text = true,
      underline = true,
      signs = true,
    },
  },
}
