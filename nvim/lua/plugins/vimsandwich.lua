return {
  {
    "machakann/vim-sandwich",
    event = "VeryLazy",
    config = function()
      local map = vim.keymap.set
      map("x", '"', '<Plug>(operator-sandwich-add)"', { silent = true })
      map("x", "(", "<Plug>(operator-sandwich-add)(", { silent = true })
      map("x", ")", "<Plug>(operator-sandwich-add))", { silent = true })
    end,
  },
}

