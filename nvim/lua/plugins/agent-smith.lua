return {
  {
    "artumont/agent-smith.nvim",
    branch = "feature/first-run-experience",
    config = function()
      local smith = require "agent-smith"
      smith.setup {
        -- Default: smith.Providers.OpenCodeProvider
        -- provider = smith.Providers.PiProvider,
        model = "opencode/mimo-v2.5-free",
        completion = { source = "blink", custom_rules = {} },
        md_files = { "AGENTS.md" },
        -- Already allowed by ~/.config/opencode/opencode.json.
        tmp_dir = "/tmp/nvim/agent-smith",
      }
    end,
  },
}
