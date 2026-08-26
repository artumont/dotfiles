local opt = vim.opt
local diagnostic = vim.diagnostic

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

-- Diagnostics
diagnostic.config {
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = "󰅚",
      [vim.diagnostic.severity.WARN] = "󰀪",
      [vim.diagnostic.severity.INFO] = "󰋽",
      [vim.diagnostic.severity.HINT] = "󰌶",
    },
  },
}
