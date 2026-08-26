vim.api.nvim_create_autocmd("FileType", {
  pattern = "neo-tree",
  callback = function(args)
    if vim.api.nvim_buf_get_name(args.buf):match "neo%-tree git_status" then
      vim.schedule(function()
        vim.bo[args.buf].filetype = "neo-tree-git"

        -- find an existing normal neo-tree window to copy props from
        local ref_win
        for _, win in ipairs(vim.api.nvim_list_wins()) do
          local buf = vim.api.nvim_win_get_buf(win)
          if vim.bo[buf].filetype == "neo-tree" then
            ref_win = win
            break
          end
        end

        local opts_to_copy = {
          "number",
          "relativenumber",
          "signcolumn",
          "foldcolumn",
          "wrap",
          "list",
          "spell",
          "cursorline",
          "cursorcolumn",
          "winfixwidth",
          "winfixheight",
          "statuscolumn",
        }

        for _, win in ipairs(vim.fn.win_findbuf(args.buf)) do
          if ref_win then
            for _, opt in ipairs(opts_to_copy) do
              local ok, val = pcall(vim.api.nvim_get_option_value, opt, { win = ref_win })
              if ok then vim.api.nvim_set_option_value(opt, val, { win = win }) end
            end
          else
            -- fallback if no other neo-tree window is open yet
            vim.wo[win].number = false
            vim.wo[win].relativenumber = false
          end
        end

        -- block opening files from this buffer
        local noop = function() end
        for _, key in ipairs { "<CR>", "o", "t", "s", "v" } do
          vim.keymap.set("n", key, noop, { buffer = args.buf, nowait = true, silent = true })
        end
      end)
    end
  end,
})
