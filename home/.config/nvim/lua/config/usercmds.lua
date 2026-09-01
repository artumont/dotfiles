local sep = require "utils.separator"
local snippets = require "utils.snippets"

-- Snippet command: write a .snippet file to project root
vim.api.nvim_create_user_command("Snippet", function(opts)
  local name = opts.args
  if name == "" then
    vim.notify("Usage: :Snippet <name>  (use <Tab> to complete)", vim.log.levels.WARN)
    return
  end

  local meta, body = snippets.find(name)
  if not meta or not body then
    vim.notify("Snippet not found: " .. name, vim.log.levels.ERROR)
    return
  end

  snippets.write(meta, body)
end, {
  nargs = "?",
  complete = function()
    local all = snippets.list()
    local completions = {}
    for _, s in ipairs(all) do
      table.insert(completions, s.name)
    end
    return completions
  end,
  desc = "Write a snippet from ~/.config/nvim/snippets/ to project root",
})
