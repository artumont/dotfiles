return {
  {
    "folke/edgy.nvim",
    lazy = false,
    priority = 1000,
    init = function()
      vim.opt.laststatus = 3
      vim.opt.splitkeep = "screen"
    end,
    opts = {
      animate = { enabled = false },
      bottom = {
        {
          ft = "toggleterm",
          size = { height = 0.2 },
          filter = function(_, win)
            return vim.api.nvim_win_get_config(win).relative == ""
          end,
        },
      },
      left = {
        {
          title = "Files",
          ft = "neo-tree",
          filter = function(buf)
            return vim.api.nvim_buf_get_name(buf):match "neo%-tree filesystem" ~= nil
          end,
          pinned = true,
          size = { height = 0.5 },
          open = "Neotree filesystem",
        },
      },
      right = {
        {
          title = "Git",
          ft = "neo-tree",
          filter = function(buf)
            return vim.api.nvim_buf_get_name(buf):match "neo%-tree git_status" ~= nil
          end,
          pinned = true,
          collapsed = false,
          size = { height = 0.5 },
          open = "Neotree git_status show right",
        },
      },
    },
  },
}
