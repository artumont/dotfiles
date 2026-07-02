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
    local is_esp_project = vim.fn.filereadable "sdkconfig" == 1 or vim.fn.filereadable "main/CMakeLists.txt" == 1

    if is_esp_project then
      local handle = io.popen "bash -c 'source ~/.espressif/tools/activate_idf_v6.0.1.sh && env'"
      if handle then
        for line in handle:lines() do
          local key, val = line:match "^([^=]+)=(.*)$"
          if key and val then vim.fn.setenv(key, val) end
        end
        handle:close()
      end
      local clangd_opts = require("esp32").lsp_config()
      require("lspconfig").clangd.setup(clangd_opts)
    end

    require("esp32").setup(opts)
  end,
}

