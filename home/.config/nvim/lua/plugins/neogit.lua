-- Git interface panel

return {
  {
    "NeogitOrg/neogit",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "sindrets/diffview.nvim",
      "folke/snacks.nvim",
    },
    config = function()
      local neogit = require "neogit"

      neogit.setup {
        graph_style = "unicode",
        kind = "floating",
        status = {
          recent_commit_count = 10,
        },
        mappings = {
          status = {
            ["<Esc>"] = "Close",
          },
        },
      }
    end,
  },
}
