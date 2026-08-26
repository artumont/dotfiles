vim.api.nvim_create_autocmd("FileType", {
  pattern = "neo-tree",
  callback = function(args)
    if vim.api.nvim_buf_get_name(args.buf):match "neo%-tree git_status" then
      vim.schedule(function() vim.bo[args.buf].filetype = "neo-tree-git" end)
    end
  end,
})
