-- Autocompletion engine

return {
  "saghen/blink.cmp",
  version = "1.*",
  dependencies = { "rafamadriz/friendly-snippets" },
  opts = {
    enabled = function() return not vim.tbl_contains({ "neo-tree", "neo-tree-popup", "toggleterm" }, vim.bo.filetype) end,
    sources = {
      default = { "lsp", "path", "snippets", "buffer", "autodocs" },
      per_filetype = {
        ["agent-smith-prompt"] = { "agent_smith" },
      },
      providers = {
        agent_smith = {
          name = "Agent-Smith",
          module = "agent-smith.extensions.blink",
          score_offset = 100,
        },
        autodocs = {
          name = "autodocs",
          module = "autodocs.blink",
          score_offset = 100,
        },
      },
    },
    cmdline = {
      enabled = true,
      completion = {
        menu = { auto_show = true },
      },
      keymap = {
        preset = "super-tab",
        ["<C-y>"] = {},
      },
    },
    keymap = {
      preset = "super-tab",
      ["<C-y>"] = {},
    },
  },
}
