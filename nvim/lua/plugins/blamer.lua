return {
  {
    "APZelos/blamer.nvim",
    event = "VeryLazy",
    config = function()
      vim.g.blamer_enabled = true
      vim.g.blamer_delay = 500
    end,
  },
}
