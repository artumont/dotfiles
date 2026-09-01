--- Snippet system: ~/.config/nvim/snippets/*.snippet
---
--- Header format:
---   target: .vimspector.json
---   description: Python debug config
---   ---
---   { file content }

local M = {}

local SNIPPETS_DIR = vim.fn.stdpath "config" .. "/snippets"

---@class SnippetMeta
---@field name string        -- display name (filename without .snippet)
---@field target string      -- target filename to write to cwd
---@field description string -- human-readable description
---@field file string        -- snippet file path

--- Parse the header block and return metadata + body.
---@param filepath string
---@return SnippetMeta?
---@return string? body
function M.parse(filepath)
  local f = io.open(filepath, "r")
  if not f then
    return nil, nil
  end

  local raw = f:read "*a"
  f:close()

  local name = filepath:match "/([^/]+)$" or filepath
  name = name:gsub("%.snippet$", "")

  -- Split on the --- separator (Lua patterns: . doesn't match \n)
  local sep_pos = raw:find("\n---\n", 1, true)
  local header_block, body
  if sep_pos then
    header_block = raw:sub(1, sep_pos - 1)
    body = raw:sub(sep_pos + 4)
  else
    return { name = name, target = name, description = "", file = filepath }, raw
  end

  -- Parse key: value pairs from header
  local target = name
  local description = ""
  for line in header_block:gmatch "[^\n]+" do
    local key, value = line:match "^(%w+):%s*(.-)%s*$"
    if key == "target" then
      target = value
    elseif key == "description" then
      description = value
    end
  end

  return {
    name = name,
    target = target,
    description = description,
    file = filepath,
  }, body
end

--- Scan snippets folder and return all parsed snippets.
---@return SnippetMeta[]
function M.list()
  local results = {}
  local scan = vim.uv.fs_scandir(SNIPPETS_DIR)
  if not scan then
    return results
  end
  while true do
    local filename = vim.uv.fs_scandir_next(scan)
    if not filename then
      break
    end
    if filename:match "%.snippet$" then
      local meta = M.parse(SNIPPETS_DIR .. "/" .. filename)
      if meta then
        table.insert(results, meta)
      end
    end
  end
  table.sort(results, function(a, b)
    return a.name < b.name
  end)
  return results
end

--- Find snippet by name.
---@param name string
---@return SnippetMeta?
---@return string? body
function M.find(name)
  local scan = vim.uv.fs_scandir(SNIPPETS_DIR)
  if not scan then
    return nil, nil
  end
  while true do
    local filename = vim.uv.fs_scandir_next(scan)
    if not filename then
      break
    end
    local stem = filename:gsub("%.snippet$", "")
    if stem == name or filename == name then
      return M.parse(SNIPPETS_DIR .. "/" .. filename)
    end
  end
  return nil, nil
end

--- Write snippet body to target in cwd, prompting on overwrite.
---@param meta SnippetMeta
---@param body string
function M.write(meta, body)
  local root = vim.fn.getcwd()
  local dest = root .. "/" .. meta.target
  local existing = io.open(dest, "r")
  if existing then
    existing:close()
    local choice = vim.fn.confirm(
      meta.target .. " already exists. Overwrite?", "&Yes\n&No", 2
    )
    if choice ~= 1 then
      return
    end
  end

  local out = io.open(dest, "w")
  if not out then
    vim.notify("Failed to write " .. dest, vim.log.levels.ERROR)
    return
  end
  out:write(body)
  out:close()
  vim.notify(meta.target .. " written to " .. root, vim.log.levels.INFO)
end

return M
