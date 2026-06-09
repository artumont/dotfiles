return {
  {
    "ThePrimeagen/99",
    config = function()
      local _99 = require "99"

      _99.setup {
        provider = _99.Providers.OpencodeProvider,
        model = "opencode/deepseek-v4-flash-free",
        tmp_dir = "/tmp/99-neovim",
      }

      local map = vim.keymap.set
      map("v", "<leader>9v", function() _99.visual() end, { desc = "Prompt agent on selection" })
      map("n", "<leader>9x", function() _99.stop_all_requests() end, { desc = "Cancel all requests" })
      map("n", "<leader>9s", function() _99.search() end, { desc = "Search codebase with agent" })
      map(
        "n",
        "<leader>9m",
        function() require("99.extensions.telescope").select_model() end,
        { desc = "Open model switcher" }
      )
    end,
  },
}
