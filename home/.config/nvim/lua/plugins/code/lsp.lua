-- Auto-discover lang modules and collect their LSP servers + mason packages

local lang_path = vim.fn.stdpath "config" .. "/lua/plugins/lang"
local lang_modules = {}
if vim.fn.isdirectory(lang_path) == 1 then
  for _, file in ipairs(vim.fn.readdir(lang_path)) do
    local name = file:match "^(.+)%.lua$"
    if name then table.insert(lang_modules, require("plugins.lang." .. name)) end
  end
end

-- Merge all servers and mason packages
local servers = {}
local mason_lsp_servers = {} -- only lspconfig server names
local mason_tools = {} -- non-lsp mason packages
for _, mod in ipairs(lang_modules) do
  for server, cfg in pairs(mod.servers or {}) do
    servers[server] = cfg
    table.insert(mason_lsp_servers, server)
  end
  for _, pkg in ipairs(mod.mason or {}) do
    table.insert(mason_tools, pkg)
  end
end

-- Remove LSP servers from tools list (they go through mason-lspconfig)
local lsp_set = {}
for _, s in ipairs(mason_lsp_servers) do
  lsp_set[s] = true
end
local filtered_tools = {}
for _, pkg in ipairs(mason_tools) do
  if not lsp_set[pkg] then table.insert(filtered_tools, pkg) end
end

table.sort(mason_lsp_servers)
table.sort(filtered_tools)

return {
  {
    "mason-org/mason.nvim",
    opts = {
      ensure_installed = filtered_tools,
    },
  },
  {
    "mason-org/mason-lspconfig.nvim",
    dependencies = { "mason-org/mason.nvim", "neovim/nvim-lspconfig" },
    opts = {
      ensure_installed = mason_lsp_servers,
      automatic_enable = false,
    },
  },
  {
    "neovim/nvim-lspconfig",
    dependencies = { "mason-org/mason-lspconfig.nvim" },
    config = function()
      local ok, blink = pcall(require, "blink.cmp")
      local cap = ok and blink.get_lsp_capabilities() or vim.lsp.protocol.make_client_capabilities()

      vim.lsp.config("*", { capabilities = cap })

      local enabled = {}
      for name, cfg in pairs(servers) do
        vim.lsp.config(name, cfg)
        table.insert(enabled, name)
      end

      vim.lsp.enable(enabled)
    end,
  },
}
