return {
  "AstroNvim/astrolsp",
  ---@type AstroLSPOpts
  opts = {
    servers = {
      "basedpyright",
      "ruff",
    },
    config = {
      basedpyright = {
        on_new_config = function(new_config, new_root)
          local venv = new_root .. "/.venv/bin/python"
          if vim.uv.fs_stat(venv) then
            new_config.settings = new_config.settings or {}
            new_config.settings.python = { pythonPath = venv }
          end
        end,
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
    },
    diagnostics = {
      underline = true,
      update_in_insert = true,
      virtual_text = false,
      severity_sort = true,
    },
    autocmds = {
      diagnostic_popup = {
        cond = true,
        {
          event = { "CursorHold" },
          desc = "Show diagnostics in a floating window safely",
          callback = function()
            for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
              local config = vim.api.nvim_win_get_config(win)
              if config.relative ~= "" then return end
            end
            vim.diagnostic.open_float(nil, { focus = false, scope = "cursor" })
          end,
        },
      },
    },
  },
}