return {
  {
    "neovim/nvim-lspconfig",
    dependencies = { "folke/snacks.nvim" },
    opts = {
      diagnostics = {
        virtual_text = {
          spacing = 4,
          prefix = "●",
        },
        underline = true,
        update_in_insert = false,
        severity_sort = true,
        signs = true,
        float = {
          border = "rounded",
          source = true,
        },
      },
      servers = {
        basedpyright = {
          settings = {
            basedpyright = {
              analysis = {
                typeCheckingMode = "standard",
                diagnosticMode = "openFilesOnly",
                useLibraryCodeForTypes = true,
                autoImportCompletions = true,
              },
              inlayHints = {
                variableTypes = false,
                functionReturnTypes = false,
                callArgumentNames = false,
                genericTypes = false,
              },
            },
          },
        },
        clangd = {}, -- placeholder, real config decided at attach-time below
      },
    },
    config = function(_, opts)
      vim.diagnostic.config(opts.diagnostics)

      local underline_timer = nil
      vim.api.nvim_create_autocmd("TextChangedI", {
        callback = function()
          if underline_timer then underline_timer:stop() end
          underline_timer = vim.defer_fn(function() vim.diagnostic.show(nil, vim.api.nvim_get_current_buf()) end, 400)
        end,
      })

      -- detect ESP-IDF projects: walk up from cwd looking for sdkconfig
      local function is_esp_idf_project()
        return vim.fs.find("sdkconfig", { upward = true, path = vim.fn.getcwd() })[1] ~= nil
      end

      for server, server_opts in pairs(opts.servers) do
        if server == "clangd" and is_esp_idf_project() then
          server_opts = vim.tbl_deep_extend("force", require("esp32").lsp_config(), {
            cmd = {
              "clangd",
              "--query-driver=/home/artu/.espressif/tools/**",
            },
          })
        end
        vim.lsp.config(server, server_opts)
        vim.lsp.enable(server)
      end
    end,
  },
}
