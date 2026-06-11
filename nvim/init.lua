vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- bootstrap lazy.nvim
local lazypath = vim.fn.stdpath "data" .. "/lazy/lazy.nvim"
if not vim.uv.fs_stat(lazypath) then
  vim.fn.system {
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  }
end

vim.g.mapleader = " "
vim.g.maplocalleader = ","

vim.opt.rtp:prepend(lazypath)

require "config.options"
require "config.keymaps"
require "config.autocmds"
require "config.usercmds"
require "lazy_setup"
