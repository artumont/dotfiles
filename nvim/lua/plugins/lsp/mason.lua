return {
  {
    "williamboman/mason.nvim",
    opts = {
      ensure_installed = { "lua_ls", "basedpyright" },
    },
  },
  {
    "williamboman/mason-lspconfig.nvim",
    dependencies = { "williamboman/mason.nvim", "neovim/nvim-lspconfig" },
    config = function()
      local lspconfig = require "lspconfig"

      local function get_python_path()
        if vim.env.VIRTUAL_ENV then return vim.env.VIRTUAL_ENV .. "/bin/python" end
        local cwd = vim.fn.getcwd()
        local local_venv = cwd .. "/.venv"
        if vim.fn.isdirectory(local_venv) == 1 then return local_venv .. "/bin/python" end
        return vim.fn.exepath "python3" or "python"
      end

      require("mason-lspconfig").setup {
        automatic_enable = true,
        handlers = {
          function(server_name) lspconfig[server_name].setup {} end,

          ["basedpyright"] = function()
            lspconfig.basedpyright.setup {
              before_init = function(_, config)
                config.settings = config.settings or {}
                config.settings.python = config.settings.python or {}
                config.settings.python.pythonPath = get_python_path()
              end,
              settings = {
                basedpyright = {
                  analysis = {
                    autoSearchPaths = true,
                    useLibraryCodeForTypes = true,
                    diagnosticMode = "openFilesOnly",
                  },
                },
              },
            }
          end,
        },
      }
    end,
  },
}
