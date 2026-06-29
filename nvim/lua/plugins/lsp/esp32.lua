return {
  "Aietes/esp32.nvim",
  dependencies = { "folke/snacks.nvim" },
  init = function()
    local handle = io.popen "bash -c 'source ~/.espressif/tools/activate_idf_v6.0.1.sh && env'"
    if handle then
      for line in handle:lines() do
        local key, val = line:match "^([^=]+)=(.*)$"
        if key and val then vim.fn.setenv(key, val) end
      end
      handle:close()
    end
  end,
  opts = {
    build_dir = "build",
    clangd_args = {
      "--query-driver=/home/artu/.espressif/tools/**",
    },
  },
}
