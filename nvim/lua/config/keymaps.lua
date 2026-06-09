local map = vim.keymap.set
local del = vim.keymap.del

local function close_buffer_or_dashboard()
  local buffers = vim.fn.getbufinfo { buflisted = 1 }
  Snacks.bufdelete()
  if #buffers <= 1 then require("edgy").open() end
end

-- Save
map({ "n", "i", "v" }, "<C-s>", "<cmd>w<CR>", { desc = "Save file" })

-- Clipboard
map("v", "<C-c>", '"+y', { desc = "Copy to system clipboard" })
map("v", "<C-x>", '"+x', { noremap = true, silent = true, desc = "Cut to system clipboard" })
map("v", "<C-v>", '"+P', { desc = "Paste over selection" })
map("i", "<C-v>", "<C-r>+", { noremap = true, silent = true, desc = "Paste from system clipboard" })
map("c", "<C-v>", "<C-r>+", { noremap = true, silent = true, desc = "Paste from system clipboard" })
map("t", "<C-S-v>", [[<C-\><C-n>"+pi]], { noremap = true, silent = true, desc = "Paste into terminal" })

-- Word navigation
map("n", "<C-Right>", "e", { desc = "Jump to end of word" })
map("i", "<C-Right>", "<C-o>e<Right>", { desc = "Jump to end of word" })
map("n", "<C-Left>", "b", { desc = "Jump to start of word" })
map("i", "<C-Left>", "<C-o>b", { desc = "Jump to start of word" })

-- Buffer close
map("n", "<C-w>", close_buffer_or_dashboard, { desc = "Close buffer or show dashboard" })
map("i", "<C-w>", function()
  vim.cmd "stopinsert"
  close_buffer_or_dashboard()
end, { desc = "Close buffer or show dashboard from insert mode" })

-- Select line (without triggering auto-copy)
map({ "n", "i" }, "<C-l>", function()
  if vim.api.nvim_get_mode().mode == "i" then vim.cmd "stopinsert" end
  vim.cmd "normal! ^v$"
end, { desc = "Select line" })

-- Edit
map("i", "<C-Backspace>", "<C-w>", { desc = "Delete word backward" })
map("v", "<BS>", "c", { noremap = true, silent = true, desc = "Delete selection" })
map({ "n", "i", "v" }, "<C-a>", "<Esc>ggVG", { desc = "Select whole file" })

-- Undo / Redo
map({ "n", "i" }, "<C-z>", "<Cmd>undo<CR>", { desc = "Undo" })
map("n", "<C-y>", "<C-r>", { desc = "Redo" })
map("i", "<C-y>", "<C-o><C-r>", { silent = true, desc = "Redo" })

-- Window navigation
map("n", "<A-Left>", "<C-w>h", { desc = "Go to left window" })
map("n", "<A-Down>", "<C-w>j", { desc = "Go to lower window" })
map("n", "<A-Up>", "<C-w>k", { desc = "Go to upper window" })
map("n", "<A-Right>", "<C-w>l", { desc = "Go to right window" })

-- LSP
map("n", "<F12>", vim.lsp.buf.definition, { desc = "Go to definition" })

-- Terminal
map("n", "<C-`>", "<cmd>ToggleTerm<CR>", { desc = "Toggle terminal" })
map("t", "<Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Buffer cycling
map("n", "<C-.>", "<cmd>bnext<CR>", { silent = true, desc = "Next buffer" })
map("n", "<C-,>", "<cmd>bprevious<CR>", { silent = true, desc = "Previous buffer" })

-- Split terminal
map("n", "<leader>ts", function()
  local count = #require("toggleterm.terminal").get_all() + 1
  require("toggleterm").toggle(count, nil, nil, "vertical")
end, { noremap = true, silent = true, desc = "Split terminal panel" })

-- Fuzzy find
map(
  { "n", "i" },
  "<C-f>",
  function() require("telescope.builtin").current_buffer_fuzzy_find() end,
  { desc = "Fuzzy search current file" }
)

map("v", "<C-f>", function()
  vim.cmd 'normal! "vy'
  local selection = vim.fn.getreg "v"
  require("telescope.builtin").current_buffer_fuzzy_find { default_text = selection }
end, { desc = "Fuzzy search selection in current file" })

-- Move lines
map("v", "<A-Up>", ":move '<-2<CR>gv=gv", { silent = true, noremap = true, desc = "Move selected lines up" })
map("v", "<A-Down>", ":move '>+1<CR>gv=gv", { silent = true, noremap = true, desc = "Move selected lines down" })

-- Remove AstroNvim defaults that conflict
del("n", "<C-Up>")
del("n", "<C-Down>")
