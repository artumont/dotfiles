local edgy = require "edgy"

vim.api.nvim_create_autocmd("StdinReadPre", {
  callback = function() vim.g.using_stdin = true end,
})

vim.api.nvim_create_autocmd("VimEnter", {
  nested = true,
  callback = function()
    local arg = vim.fn.argv(0)
    if arg and vim.fn.isdirectory(arg) == 1 then
      vim.cmd "bwipeout!"
      vim.cmd("cd " .. vim.fn.fnameescape(arg))
    end
    vim.defer_fn(function()
      require("edgy").open()
      vim.cmd "Neotree filesystem"
    end, 100)
    edgy.open()
  end,
})
