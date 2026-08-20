return {
  {
    "artumont/agent-smith.nvim",
    config = function()
      local smith = require "agent-smith"
      smith.setup {
        provider = smith.Providers.Opencode,
        model = "opencode/mimo-v2.5-free",
        completion = { source = "blink", custom_rules = {} },
        md_files = { "AGENTS.md" },
      }
    end,
  },
}
