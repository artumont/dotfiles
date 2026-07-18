return {
  {
    "artumont/agent-smith.nvim",
    config = function()
      local smith = require "agent-smith"
      smith.setup {
        provider = smith.Providers.PiProvider,
        model = "opencode/mimo-v2.5-free",
        completion = { source = "blink", custom_rules = {} },
        md_files = { "AGENTS.md" },
        tmp_dir = "/tmp/nvim/agent-smith",
      }
    end,
  },
}
