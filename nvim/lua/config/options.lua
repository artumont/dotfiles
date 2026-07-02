---@return number width
---@return number height
local function getScreenResolution()
  local raw_res = vim.fn.system "xrandr | grep -w 'connected primary' | awk '{print $4}'"

  local width, height = raw_res:match "(%d+)x(%d+)"

  return width, height
end

vim.opt.cmdheight = 0

vim.opt.keymodel = "startsel,stopsel"
vim.opt.clipboard = "unnamedplus"

vim.opt.relativenumber = false
vim.opt.number = true

vim.opt.expandtab = true
vim.opt.shiftwidth = 2
vim.opt.tabstop = 2

vim.opt.wrap = false

vim.o.splitbelow = true

vim.diagnostic.config {
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = "󰅚",
      [vim.diagnostic.severity.WARN] = "󰀪",
      [vim.diagnostic.severity.INFO] = "󰋽",
      [vim.diagnostic.severity.HINT] = "󰌶",
    },
  },
}

local width, height = getScreenResolution()
if tonumber(width) == 2560 and tonumber(height) == 1440 then
  vim.g.neovide_scale_factor = 0.9
else
  vim.g.neovide_scale_factor = 0.8
end
