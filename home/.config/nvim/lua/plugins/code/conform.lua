return {
  "stevearc/conform.nvim",
  event = "BufWritePre",
  opts = {
    formatters_by_ft = {
      bash = { "shfmt" },
      c = { "clang-format" },
      cpp = { "clang-format" },
      go = { "gofumpt" },
      json = { "prettier" },
      lua = { "stylua" },
      markdown = { "prettier" },
      python = { "ruff_format" },
      terraform = { "terraform_fmt" },
      toml = { "prettier" },
      yaml = { "prettier" },
    },
    format_on_save = {
      timeout_ms = 500,
      lsp_format = "fallback",
    },
  },
}
