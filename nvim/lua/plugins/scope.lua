-- Scoped buffer tabs per tabpage

return {
  {
    "tiagovla/scope.nvim",
    event = "VeryLazy",
    config = function() require("scope").setup() end,
  },
}
