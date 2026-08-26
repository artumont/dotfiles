local map = Snacks.keymap.set
local del = vim.keymap.set

local function is_file_buffer(buf) return vim.bo[buf or 0].buftype == "" end

-- UI Toggles
map("n", "<leader>ee", "<cmd>Neotree toggle<CR>", { desc = "Toggle file explorer" })
map("n", "<leader>eg", "<cmd>Neotree git_status toggle right<CR>", { desc = "Toggle git explorer" })
map("n", "<leader>gg", function()
  Snacks.lazygit {
    win = {
      keys = {
        term_normal = {
          "<Esc><Esc>",
          function(self) self:close() end,
          mode = "t",
          desc = "Close LazyGit",
        },
      },
    },
  }
end, { desc = "Open LazyGit" })
map("n", "<leader>xx", "<cmd>Trouble diagnostics toggle filter.buf=0<CR>", { desc = "Toggle buffer diagnostics" })
map("n", "<leader>xg", "<cmd>Trouble diagnostics toggle<CR>", { desc = "Toggle global diagnostics" })

-- File Manipulation
map(
  "n",
  "<leader>w",
  function() pcall(vim.api.nvim_command, "write") end,
  { desc = "Save file", enabled = is_file_buffer }
)

map("v", "<Tab>", ">gv", { noremap = true, silent = true, desc = "Indent selection", enabled = is_file_buffer })
map("v", "<S-Tab>", "<gv", { noremap = true, silent = true, desc = "Dedent selection", enabled = is_file_buffer })

-- Git
map("n", "<leader>gi", function() Snacks.picker.gh_issue { state = "all" } end, { desc = "Open Github Issues" })
map("n", "<leader>gp", function() Snacks.picker.gh_pr { state = "all" } end, { desc = "Open Github Pull Requests" })

-- Buffer
map("n", "<leader>bd", function() Snacks.bufdelete(0) end, { desc = "Delete current buffer" })
map("n", "<leader>bD", function() Snacks.bufdelete.other() end, { desc = "Delete all other buffers" }) --

-- Lsp Actions
map("n", "ma", function() vim.lsp.buf.code_action() end, { desc = "Open code actions" })
