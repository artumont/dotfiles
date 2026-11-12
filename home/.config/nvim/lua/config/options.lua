local opt = vim.opt
local diagnostic = vim.diagnostic

-- Add mason bin to PATH so conform.nvim can find formatters
local mason_bin = vim.fn.stdpath "data" .. "/mason/bin"
vim.env.PATH = mason_bin .. ":" .. vim.env.PATH

-- Command bar
opt.cmdheight = 0

-- Clipboard
opt.keymodel = "startsel,stopsel"
opt.clipboard = "unnamedplus"

-- Buffer
opt.relativenumber = false
opt.number = true

opt.expandtab = true
opt.shiftwidth = 2
opt.tabstop = 2

opt.autoread = true
vim.opt.wrap = false

vim.opt.mousescroll = "ver:2,hor:2"

vim.o.exrc = true

-- Python Indentation
vim.g.python_indent = {
  closed_paren_align_last_line = false,
  open_paren = "shiftwidth()",
  continue = "shiftwidth()",
  nested_paren = "shiftwidth()",
  disable_parentheses_indenting = false,
}

-- Diagnostics
diagnostic.config {
  virtual_text = true,
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = "󰅚",
      [vim.diagnostic.severity.WARN] = "󰀪",
      [vim.diagnostic.severity.INFO] = "󰋽",
      [vim.diagnostic.severity.HINT] = "󰌶",
    },
  },
}
