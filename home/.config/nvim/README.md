# Neovim Config

## Structure

```text
config/          Core settings loaded at startup
  options.lua    Editor options (tabs, line numbers, clipboard, etc.)
  keymaps.lua    Custom keybindings
  autocmds.lua   Autocommands (format on save, highlight yank, etc.)

plugins/         One file per plugin spec, grouped by purpose
  core/          Editor essentials (oil, pairs, which-key, trouble)
  ui/            Visual chrome (statusline, bufferline, icons, notifications)
  find/          Search and navigation (telescope, tmux-navigator)
  code/          Language tooling (lsp, completion, formatting, linting, snippets)
  git/           Version control (gitsigns, fugitive)
  debug/         Debugger (dap, dap-ui)

themes/          Colorscheme specs
lazy_setup.lua   Bootstrap and lazy.nvim config
init.lua         Entry point, loads config/ then lazy_setup
```

## Adding a plugin

Create a new `.lua` file in the matching `plugins/<section>/` directory. Return a lazy.nvim spec table:

```lua
return {
  "author/plugin-name",
  opts = {},
}
```

Dependencies go inside `dependencies = {}`. Co-modules (bridging two plugins) get their own file.
