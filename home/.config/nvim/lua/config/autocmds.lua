vim.api.nvim_create_autocmd("FileType", {
  pattern = "neo-tree",
  callback = function(args)
    if vim.api.nvim_buf_get_name(args.buf):match "neo%-tree git_status" then
      vim.schedule(function()
        vim.bo[args.buf].filetype = "neo-tree-git"

        for _, win in ipairs(vim.fn.win_findbuf(args.buf)) do
          vim.wo[win].number = false
          vim.wo[win].relativenumber = false
        end
      end)
    end
  end,
})
