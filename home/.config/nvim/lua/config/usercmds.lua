local snippets = require "utils.snippets"
local mason = require "utils.mason"

vim.api.nvim_create_user_command("MasonPresetInstall", function(opts)
  local query = opts.args
  if query == "" then
    vim.notify("Usage: :MasonPresetInstall <language>", vim.log.levels.WARN)
    return
  end

  local lang = mason.find_lang(query)
  if not lang then
    vim.notify("Unknown lang: " .. query, vim.log.levels.ERROR)
    return
  end
  mason.install_lang(lang)
end, {
  nargs = "?",
  complete = function(arg_lead)
    local langs = mason.list_langs()
    local completions = {}
    for _, lang in ipairs(langs) do
      if lang.name:find(arg_lead, 1, true) then
        table.insert(completions, lang.name)
      end
    end
    return completions
  end,
  desc = "Install mason packages for a language",
})

vim.api.nvim_create_user_command("MasonPresetUninstall", function(opts)
  local query = opts.args
  if query == "" then
    vim.notify("Usage: :MasonPresetUninstall <language>", vim.log.levels.WARN)
    return
  end

  local lang = mason.find_lang(query)
  if not lang then
    vim.notify("Unknown lang: " .. query, vim.log.levels.ERROR)
    return
  end
  mason.uninstall_lang(lang)
end, {
  nargs = "?",
  complete = function(arg_lead)
    local langs = mason.list_langs()
    local completions = {}
    for _, lang in ipairs(langs) do
      if lang.name:find(arg_lead, 1, true) then
        table.insert(completions, lang.name)
      end
    end
    return completions
  end,
  desc = "Uninstall mason packages for a language",
})

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
