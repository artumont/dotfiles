local edgy = require "edgy"
local resession = require "resession"

resession.setup {
  autosave = {
    enabled = true,
    interval = 60,
    notify = false,
  },
}

resession.add_hook("post_load", function()
  local bufs = {}
  for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
    if vim.bo[bufnr].buflisted then
      table.insert(bufs, bufnr)
    end
  end
  vim.t.bufs = bufs
  vim.cmd.redrawtabline()
end)

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
    resession.load(vim.fn.getcwd(), { dir = "dirsession", silence_errors = true })
    resession.save(vim.fn.getcwd(), { dir = "dirsession", notify = false })
  end,
})

vim.api.nvim_create_autocmd("VimLeavePre", {
  callback = function()
    resession.save(vim.fn.getcwd(), { dir = "dirsession", notify = false })
  end,
})