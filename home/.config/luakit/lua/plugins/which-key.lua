local keymaps = require "config.keymaps"

return {
  "artumont/which-key.luakit",
  module = "which-key",
  config = true,
  main = "which-key",
  opts = {
    behaviour = {
      discover = false,
      bind_leader = false,
    },
    spec = keymaps,
  },
}
