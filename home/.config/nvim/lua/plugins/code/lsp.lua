-- Auto-discover lang modules and collect their LSP servers + mason packages

local lang_path = vim.fn.stdpath "config" .. "/lua/plugins/lang"
local lang_modules = {}

if vim.fn.isdirectory(lang_path) == 1 then
  for _, file in ipairs(vim.fn.readdir(lang_path)) do
    local name = file:match "^(.+)%.lua$"
    if name then
      table.insert(lang_modules, require("plugins.lang." .. name))
    end
  end
end

-- Merge all servers and mason packages
local servers = {}
local mason_packages = {}

for _, mod in ipairs(lang_modules) do
  for server, cfg in pairs(mod.servers or {}) do
    servers[server] = cfg
  end
  for _, pkg in ipairs(mod.mason or {}) do
    table.insert(mason_packages, pkg)
  end
end

table.sort(mason_packages)

return {
  {
    "mason-org/mason.nvim",
    opts = {},
  },
  {
    "mason-org/mason-lspconfig.nvim",
    dependencies = { "mason-org/mason.nvim", "neovim/nvim-lspconfig" },
    opts = {
      ensure_installed = mason_packages,
      automatic_enable = false,
    },
  },
  {
    "neovim/nvim-lspconfig",
    dependencies = { "mason-org/mason-lspconfig.nvim" },
    config = function()
      local lspconfig = require "lspconfig"
      local cap = require("blink.cmp").get_lsp_capabilities()

      for name, cfg in pairs(servers) do
        local merged = vim.tbl_deep_extend("force", { capabilities = cap }, cfg)
        lspconfig[name].setup(merged)
      end
    end,
  },
}
