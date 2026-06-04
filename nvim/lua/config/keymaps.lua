local map = vim.keymap.set
local del = vim.keymap.del

map({ "n", "i", "v" }, "<C-s>", "<cmd>w<CR>", { desc = "Save file" })

map("v", "<C-c>", '"+y', { desc = "Copy to System Clipboard" })
map("i", "<C-v>", "<C-r>+", { desc = "Paste from System Clipboard" })
map("v", "<C-v>", '"+p', { desc = "Paste Over Selection" })

map("n", "<C-Right>", "e", { desc = "Jump to end of word" })
map("i", "<C-Right>", "<C-o>e<Right>", { desc = "Jump to end of word" })

map("n", "<C-Left>", "b", { desc = "Jump to start of word" })
map("i", "<C-Left>", "<C-o>b", { desc = "Jump to start of word" })

map("n", "<C-w>", function() Snacks.bufdelete() end, { desc = "Close current tab" })
map("i", "<C-w>", function()
  vim.cmd "stopinsert"
  Snacks.bufdelete()
end, { desc = "Close tab from Insert Mode" })

map({ "n", "i" }, "<C-l>", "<Esc>0v$<C-g>", { desc = "Select line without auto-copy" })

map("i", "<C-Backspace>", "<C-w>", { desc = "Delete word backward" })

map({ "n", "i" }, "<C-z>", "<Cmd>undo<CR>", { desc = "Undo Last Action" })
map("n", "<C-y>", "<C-r>", { desc = "Redo Last Action" })
map("i", "<C-y>", "<C-o><C-r>", { desc = "Redo inside Insert Mode", silent = true })

map("n", "<A-Left>", "<C-w>h", { desc = "Go to Left Window Split" })
map("n", "<A-Down>", "<C-w>j", { desc = "Go to Lower Window Split" })
map("n", "<A-Up>", "<C-w>k", { desc = "Go to Upper Window Split" })
map("n", "<A-Right>", "<C-w>l", { desc = "Go to Right Window Split" })

map({ "n", "i", "v" }, "<C-a>", "<Esc>ggVG<CR>", { desc = "Select whole file" })
map("v", "<BS>", "c", { noremap = true, silent = true, desc = "Delete selection inside v-line" })

map("n", "<F12>", vim.lsp.buf.definition, { desc = "LSP Go to Definition (VS Code style)" })

map("n", "<C-`>", "<cmd>ToggleTerm<CR>", { desc = "Toggle Terminal" })

map("t", "<Esc>", "<C-\\><C-n>", { desc = "Exit Terminal Mode" })

map("v", "<C-x>", "+d", { desc = "Cut to System Clipboard" })

map("n", "<C-.>", "<cmd>bnext<CR>", { silent = true, desc = "Next Buffer" })

map("n", "<C-,>", "<cmd>bprevious<CR>", { silent = true, desc = "Next Buffer" })

del("n", "<C-Up>")
del("n", "<C-Down>")
