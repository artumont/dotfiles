return {
  "MagicDuck/grug-far.nvim",
  opts = {
    windowCreationCommand = "GrugFarFloat",
  },
  config = function(_, opts)
    vim.api.nvim_create_user_command(
      "GrugFarFloat",
      function()
        vim.api.nvim_open_win(0, true, {
          relative = "editor",
          width = math.floor(vim.o.columns * 0.8),
          height = math.floor(vim.o.lines * 0.8),
          row = math.floor(vim.o.lines * 0.1),
          col = math.floor(vim.o.columns * 0.1),
          style = "minimal",
          border = "rounded",
        })
      end,
      {}
    )

    vim.api.nvim_create_autocmd("FileType", {
      group = vim.api.nvim_create_augroup("grug-far-close-with-q", { clear = true }),
      pattern = "grug-far",
      callback = function(args)
        vim.keymap.set(
          "n",
          "q",
          function() require("grug-far").get_instance(0):close() end,
          { buffer = args.buf, desc = "grug-far: close" }
        )
      end,
    })

    opts.helpLine = { enabled = false }
    opts.showCompactInputs = true
    opts.showInputsTopPadding = false
    opts.showInputsBottomPadding = false
    require("grug-far").setup(opts)
  end,
}
