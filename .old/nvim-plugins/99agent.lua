-- AI coding assistant integration via OpenCode

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
        model = "opencode/mimo-v2.5-free",
        tmp_dir = "/tmp/99-neovim",
      }
    end,
  },
}
