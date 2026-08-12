-- Generate .gitignore files from templates

return {
  {
    "artumont/gitignore-templates.nvim",
    cmd = { "Gitignore", "GitignoreUpdate", "GitignoreClear" },
    opts = {},
  },
}
