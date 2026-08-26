-- Manage window layout positions (left/right/bottom edges)

return {
  "folke/edgy.nvim",
  lazy = false,
  priority = 1000,
  init = function()
    vim.opt.laststatus = 3
    vim.opt.splitkeep = "screen"
  end,
  opts = {
    wo = {
      winbar = true,
    },
    exit_when_last = false,
    animate = { enabled = false },
    left = {
      {
        title = "Files",
        ft = "neo-tree",
        filter = function(buf) return vim.api.nvim_buf_get_name(buf):match "neo%-tree filesystem" ~= nil end,
        pinned = true,
        size = { height = 1.0, width = 0.13 },
        open = "Neotree filesystem",
      },
    },
  },
  filter = function(buf, win)
    local ft = vim.bo[buf].filetype
    return ft ~= "DiffviewFiles" and ft ~= "DiffviewFile" and ft ~= "DiffviewFileHistory"
  end,
}
