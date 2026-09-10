local M = {}

local lang_path = vim.fn.stdpath "config" .. "/lua/plugins/lang"

--- Get list of available languages and their mason packages
---@return table<{ name: string, lsp: table<string, table>, mason: string[] }>
function M.list_langs()
  local langs = {}

  if vim.fn.isdirectory(lang_path) == 1 then
    for _, file in ipairs(vim.fn.readdir(lang_path)) do
      local name = file:match "^(.+)%.lua$"
      if name then
        local mod = require("plugins.lang." .. name)
        local has_content = next(mod.servers or {}) or #mod.mason > 0
        if has_content then
          table.insert(langs, {
            name = name,
            lsp = mod.servers or {},
            mason = mod.mason or {},
          })
        end
      end
    end
  end

  table.sort(langs, function(a, b) return a.name < b.name end)
  return langs
end

--- Find a lang by name (fuzzy partial match)
---@param query string
---@return table?
function M.find_lang(query)
  local langs = M.list_langs()

  for _, lang in ipairs(langs) do
    if lang.name == query then return lang end
  end
  for _, lang in ipairs(langs) do
    if lang.name:find(query, 1, true) then return lang end
  end

  return nil
end

--- Install missing mason packages for a language
---@param lang table
function M.install_lang(lang)
  if #lang.mason == 0 then
    vim.notify(lang.name .. ": no mason packages declared", vim.log.levels.WARN)
    return
  end

  local ok, registry = pcall(require, "mason-registry")
  if not ok then
    vim.notify("mason-registry not loaded", vim.log.levels.ERROR)
    return
  end

  local missing = {}
  for _, pkg_name in ipairs(lang.mason) do
    local ok_pkg, pkg = pcall(registry.get_package, pkg_name)
    if ok_pkg and pkg and not pkg:is_installed() then table.insert(missing, pkg_name) end
  end

  if #missing == 0 then
    vim.notify(lang.name .. ": all packages already installed", vim.log.levels.INFO)
    return
  end

  -- install missing via :MasonInstall
  vim.cmd("MasonInstall " .. table.concat(missing, " "))

  -- re-attach LSP servers for this lang
  if next(lang.lsp) then
    for name, cfg in pairs(lang.lsp) do
      vim.lsp.config(name, cfg)
    end

    -- Enable the language servers globally
    local server_names = vim.tbl_keys(lang.lsp)
    vim.lsp.enable(server_names)

    -- Safely trigger Neovim to re-evaluate and attach the servers to open buffers
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      if vim.api.nvim_buf_is_loaded(buf) and vim.bo[buf].buftype == "" then
        vim.api.nvim_exec_autocmds("FileType", { buf = buf })
      end
    end
  end
end

--- Uninstall mason packages for a language
---@param lang table
function M.uninstall_lang(lang)
  if #lang.mason == 0 then
    vim.notify(lang.name .. ": no mason packages declared", vim.log.levels.WARN)
    return
  end

  local ok, registry = pcall(require, "mason-registry")
  if not ok then
    vim.notify("mason-registry not loaded", vim.log.levels.ERROR)
    return
  end

  local installed = {}
  for _, pkg_name in ipairs(lang.mason) do
    local ok_pkg, pkg = pcall(registry.get_package, pkg_name)
    if ok_pkg and pkg and pkg:is_installed() then table.insert(installed, pkg_name) end
  end

  if #installed == 0 then
    vim.notify(lang.name .. ": no packages installed", vim.log.levels.INFO)
    return
  end

  vim.cmd("MasonUninstall " .. table.concat(installed, " "))
end

return M
