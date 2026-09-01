return {
  "puremourning/vimspector",
  cmd = { "VimspectorInstall", "VimspectorUpdate" },
  init = function() vim.g.vimspector_install_gadgets = { "debugpy", "vscode-cpptools" } end,
}
