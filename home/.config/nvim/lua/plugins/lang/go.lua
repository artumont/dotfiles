return {
  servers = {
    gopls = {
      settings = {
        gopls = {
          gofumpt = true,
          codelenses = { generate = true, gc_details = true, test = true },
          analyses = { unusedparams = true, shadow = true },
          usePlaceholders = true,
          completeUnimported = true,
        },
      },
    },
  },

  mason = {
    "gopls",
    "golangci-lint",
    "golangci-lint-langserver",
    "gofumpt",
    "goimports-reviser",
    "gomodifytags",
    "gotests",
  },
}
