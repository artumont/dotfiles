-- Dynamically append local binary paths so GUI wrappers like Neovide can see them
local local_bin = vim.fn.expand "$HOME/.local/bin"
if vim.fn.isdirectory(local_bin) == 1 and not string.find(vim.env.PATH, local_bin, 1, true) then
  vim.env.PATH = local_bin .. ":" .. vim.env.PATH
end

-- Dynamically inject OpenCode's binary path for GUI clients like Neovide
local opencode_bin = vim.fn.expand "$HOME/.opencode/bin"
if vim.fn.isdirectory(opencode_bin) == 1 and not string.find(vim.env.PATH, opencode_bin, 1, true) then
  vim.env.PATH = opencode_bin .. ":" .. vim.env.PATH
end

-- This file simply bootstraps the installation of Lazy.nvim and then calls other files for execution
-- This file doesn't necessarily need to be touched, BE CAUTIOUS editing this file and proceed at your own risk.
local lazypath = vim.env.LAZY or vim.fn.stdpath "data" .. "/lazy/lazy.nvim"

if not (vim.env.LAZY or (vim.uv or vim.loop).fs_stat(lazypath)) then
  -- stylua: ignore
  local result = vim.fn.system({ "git", "clone", "--filter=blob:none", "https://github.com/folke/lazy.nvim.git", "--branch=stable", lazypath })
  if vim.v.shell_error ~= 0 then
    -- stylua: ignore
    vim.api.nvim_echo({ { ("Error cloning lazy.nvim:\n%s\n"):format(result), "ErrorMsg" }, { "Press any key to exit...", "MoreMsg" } }, true, {})
    vim.fn.getchar()
    vim.cmd.quit()
  end
end

vim.opt.rtp:prepend(lazypath)

-- validate that lazy is available
if not pcall(require, "lazy") then
  -- stylua: ignore
  vim.api.nvim_echo({ { ("Unable to load lazy from: %s\n"):format(lazypath), "ErrorMsg" }, { "Press any key to exit...", "MoreMsg" } }, true, {})
  vim.fn.getchar()
  vim.cmd.quit()
end

require "lazy_setup"
require "config.options"
require "config.keymaps"
require "config.autocmds"
require "config.usercmds"
