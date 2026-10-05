local M = {}

local lang_path = vim.fn.stdpath "config" .. "/lua/plugins/lang"

function M.list_langs()
  local langs = {}

  if vim.fn.isdirectory(lang_path) == 1 then
    for _, file in ipairs(vim.fn.readdir(lang_path)) do
      local name = file:match "^(.+)%.lua$"
      if name then
        local mod = require("plugins.lang." .. name)
        local has_content = next(mod.servers or {})
        if has_content then
          table.insert(langs, {
            lang_name = name,
            servers = mod.servers or {},
          })
        end
      end
    end
  end

  table.sort(langs, function(a, b) return a.lang_name < b.lang_name end)
  return langs
end

return M
