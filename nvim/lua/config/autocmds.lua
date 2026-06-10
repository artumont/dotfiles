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
      vim.cmd "Neotree git_status show right"
    end, 100)
  end,
})
