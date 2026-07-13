-- ESP-IDF development support (clangd, build integration)

return {
  "Aietes/esp32.nvim",
  ft = { "c", "cpp" },
  dependencies = { "folke/snacks.nvim", "neovim/nvim-lspconfig" },
  opts = {
    build_dir = "build",
    clangd_args = {
      "--query-driver=/home/artu/.espressif/tools/**",
    },
  },
  config = function(_, opts)
    require("esp32").setup(opts)

    local configured = false

    vim.api.nvim_create_autocmd("FileType", {
      pattern = { "c", "cpp" },
      callback = function(args)
        local root = vim.fs.root(args.buf, { "sdkconfig", "main/CMakeLists.txt" })

        if root and not configured then
          configured = true

          local candidates = vim.fn.glob(vim.fn.expand "~/.espressif/tools/activate_idf_v*.sh", false, true)
          if #candidates == 0 then
            vim.notify("esp32.nvim: no activate_idf_v*.sh found", vim.log.levels.WARN)
          else
            table.sort(candidates, function(a, b) return vim.fn.getftime(a) > vim.fn.getftime(b) end)

            local handle = io.popen(("bash -c 'source %s && env'"):format(vim.fn.shellescape(candidates[1])))
            if handle then
              for line in handle:lines() do
                local key, val = line:match "^([^=]+)=(.*)$"
                if key and val then vim.fn.setenv(key, val) end
              end
              handle:close()
            end

            local clangd_opts = require("esp32").lsp_config()
            vim.lsp.config("clangd", clangd_opts)

            for _, client in ipairs(vim.lsp.get_clients { name = "clangd" }) do
              client:stop(true)
            end
          end
        end

        vim.lsp.enable "clangd"
      end,
    })
  end,
}
