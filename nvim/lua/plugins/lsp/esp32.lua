return {
  "Aietes/esp32.nvim",
  dependencies = { "folke/snacks.nvim" },
  opts = {
    build_dir = "build",
    clangd_args = {
      "--query-driver=/home/artu/.espressif/tools/**",
    },
  },
}
