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
}
