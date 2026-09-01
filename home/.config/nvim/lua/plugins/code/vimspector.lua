return {
  "puremourning/vimspector",
  lazy = false,
  cmd = { "VimspectorInstall", "VimspectorUpdate" },
  init = function() vim.g.vimspector_install_gadgets = { "debugpy", "vscode-cpptools" } end,
}
