-- Nvim ai-agent

return {
  "artumont/agent-smith.nvim",
  config = function()
    require("agent-smith").setup {
      provider = "commandcode",
      model = "xiaomi/mimo-v2.6-flash",
    }
  end,
}
