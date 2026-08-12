-- Tokyo Night Theme

return {
  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
    opts = {
      style = "storm",
      transparent = false,
      styles = {
        sidebars = "dark",
        floats = "dark",
      },
    },
    config = function(_, opts)
      require("tokyonight").setup(opts)
      vim.api.nvim_set_hl(0, "NeoTreeFloatBorder", { fg = "#565f89" })
      vim.api.nvim_set_hl(0, "NeoTreeFloatTitle", { fg = "#7aa2f7", bold = true })
      vim.api.nvim_set_hl(0, "NeoTreeFloatNormal", { bg = "#1a1b26" })
    end,
  },
}
