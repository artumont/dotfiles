return {
  {
    "NeogitOrg/neogit",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "sindrets/diffview.nvim",
    },
    config = function()
      local neogit = require "neogit"

      neogit.setup {
        graph_style = "unicode",
        kind = "replace",
        status = {
          recent_commit_count = 10,
        },
      }
    end,
  },
}
