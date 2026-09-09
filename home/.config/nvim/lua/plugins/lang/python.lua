return {
  servers = {
    basedpyright = {
      settings = {
        basedpyright = {
          analysis = {
            typeCheckingMode = "standard",
            autoImportCompletions = true,
            ignore = { ".venv", "venv", "env", "__pycache__", ".git", ".eggs", "node_modules", ".mypy_cache", ".ruff_cache", ".pytest_cache" },
            exclude = { "**/.venv/**", "**/venv/**", "**/env/**", "**/site-packages/**", "refs/**", "templates/**", "docs/**", "specs/**" },
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
  filetypes = { "python" },
}
