vim.api.nvim_create_autocmd({ "FileChangedShellPost" }, {
  pattern = "*",
  callback = function() vim.notify("File changed on disk. Reloaded.", vim.log.levels.WARN) end,
})
