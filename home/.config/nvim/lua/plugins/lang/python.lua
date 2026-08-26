return {
  servers = {
    basedpyright = {
      settings = {
        basedpyright = {
          analysis = {
            typeCheckingMode = "standard",
            autoImportCompletions = true,
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
