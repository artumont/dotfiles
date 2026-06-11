return {
  {
    "ThePrimeagen/99",
    dependencies = {
      "nvim-telescope/telescope.nvim",
    },
    config = function()
      local _99 = require "99"

      _99.setup {
        provider = _99.Providers.OpencodeProvider,
        model = "opencode/deepseek-v4-flash-free",
        tmp_dir = "/tmp/99-neovim",
      }
    end,
  },
}
