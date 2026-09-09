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
for _, mod in ipairs(lang_modules) do
  for server, cfg in pairs(mod.servers or {}) do
    servers[server] = cfg
    table.insert(mason_lsp_servers, server)
  end
end

-- Build LSP server set for filtering
local lsp_set = {}
for _, s in ipairs(mason_lsp_servers) do
  lsp_set[s] = true
end

-- Split non-LSP mason tools into:
--   generic_tools: modules with no filetypes → install on start
--   filetype_tools: modules with filetypes → install lazily on FileType
local generic_tools = {}
local filetype_tools = {} -- ft -> { pkg, ... }

for _, mod in ipairs(lang_modules) do
  local non_lsp = {}
  for _, pkg in ipairs(mod.mason or {}) do
    if not lsp_set[pkg] then table.insert(non_lsp, pkg) end
  end

  if mod.filetypes and #non_lsp > 0 then
    for _, ft in ipairs(mod.filetypes) do
      if not filetype_tools[ft] then filetype_tools[ft] = {} end
      for _, pkg in ipairs(non_lsp) do
        table.insert(filetype_tools[ft], pkg)
      end
    end
  else
    for _, pkg in ipairs(non_lsp) do
      table.insert(generic_tools, pkg)
    end
  end
end

table.sort(mason_lsp_servers)
table.sort(generic_tools)

return {
  {
    "mason-org/mason.nvim",
    cmd = "Mason",
    event = "VeryLazy",
    opts = {},
  },
  {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    dependencies = { "mason-org/mason.nvim" },
    cmd = { "MasonToolInstallerInstall", "MasonToolInstallerUpdate" },
    event = "VeryLazy",
    opts = {
      ensure_installed = generic_tools,
      auto_update = false,
      run_on_start = #generic_tools > 0,
    },
  },
  {
    "mason-org/mason-lspconfig.nvim",
    dependencies = { "mason-org/mason.nvim", "neovim/nvim-lspconfig" },
    event = "VeryLazy",
    opts = {
      ensure_installed = mason_lsp_servers,
      automatic_enable = false,
    },
  },
  {
    "neovim/nvim-lspconfig",
    event = "VeryLazy",
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

      -- Lazy-install non-LSP mason tools per filetype
      local augroup = vim.api.nvim_create_augroup("MasonLazyInstall", { clear = true })
      for ft, tools in pairs(filetype_tools) do
        vim.api.nvim_create_autocmd("FileType", {
          group = augroup,
          pattern = ft,
          once = true,
          callback = function()
            local reg_ok, registry = pcall(require, "mason-registry")
            if not reg_ok then return end
            local missing = {}
            for _, pkg in ipairs(tools) do
              if not registry.is_installed(pkg) then
                table.insert(missing, pkg)
              end
            end
            if #missing > 0 then
              vim.cmd("MasonToolInstall " .. table.concat(missing, ","))
            end
          end,
        })
      end
    end,
  },
}
