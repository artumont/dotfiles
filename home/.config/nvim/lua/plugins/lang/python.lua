return {
  servers = {
    basedpyright = {
      settings = {
        basedpyright = {
          analysis = {
            typeCheckingMode = "standard",
            autoImportCompletions = true,
            diagnosticMode = "openFilesOnly",
            ignore = { ".venv", "venv", "env", "__pycache__", ".git" },
            diagnosticSeverityOverrides = {
              reportUnknownMemberType = "warning",
              reportMissingTypeStubs = "information",
            },
          },
        },
      },
    },
  },

  mason = { "basedpyright", "ruff", "debugpy" },
}
