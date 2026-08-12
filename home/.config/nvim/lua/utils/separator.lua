-- Section separator utility: auto-detects comment prefix per filetype
local M = {}

-- Comment prefix map
local ft_comment = {
  -- // style
  go = "//",
  javascript = "//",
  typescript = "//",
  jsx = "//",
  tsx = "//",
  java = "//",
  c = "//",
  cpp = "//",
  csharp = "//",
  rust = "//",
  swift = "//",
  kotlin = "//",
  scala = "//",
  php = "//",
  zig = "//",
  dart = "//",
  proto = "//",
  -- # style
  python = "#",
  ruby = "#",
  perl = "#",
  bash = "#",
  sh = "#",
  zsh = "#",
  dockerfile = "#",
  makefile = "#",
  cmake = "#",
  yaml = "#",
  yml = "#",
  toml = "#",
  conf = "#",
  ini = "#",
  gitignore = "#",
  env = "#",
  terraform = "#",
  hcl = "#",
  graphql = "#",
  -- -- style
  lua = "--",
  sql = "--",
  vim = "--",
  -- HTML comment style
  html = "<!--",
  xml = "<!--",
  markdown = "<!--",
  -- CSS comment style
  css = "/*",
  scss = "/*",
  less = "/*",
  -- JSON (treated as code)
  json = "//",
  jsonc = "//",
}

function M.get_comment() return ft_comment[vim.bo.filetype] or "//" end

function M.make_separator_parts(name)
  local comment = M.get_comment()
  local prefix = comment .. " ── "
  local closing = ({ ["<!--"] = " -->", ["/*"] = " */" })[comment] or ""
  local suffix = " ──"
  local pad = 80 - vim.fn.strdisplaywidth(prefix .. name .. suffix .. closing)

  if pad > 0 then suffix = suffix .. string.rep("─", pad) end
  return prefix, suffix .. closing
end

function M.make_separator(name)
  local prefix, suffix = M.make_separator_parts(name)
  return prefix .. name .. suffix
end

return M
