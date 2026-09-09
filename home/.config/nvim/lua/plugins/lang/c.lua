return {
  servers = {
    clangd = {},
  },

  mason = { "clangd", "clang-format", "codelldb", "cpplint" },
  filetypes = { "c", "cpp", "objc", "objcpp", "cuda" },
}
