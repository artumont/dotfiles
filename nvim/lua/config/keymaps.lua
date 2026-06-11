local map = vim.keymap.set
local del = vim.keymap.del

-- UI Toggles
map("n", "<leader>E", "<cmd>Neotree toggle<CR>", { desc = "Toggle File Explorer" })
map("n", "<leader>G", "<cmd>Neotree git_status toggle<CR>", { desc = "Toggle Git Explorer" })
map("n", "<leader>X", "<cmd>Trouble diagnostics toggle filter.buf=0<cr>", { desc = "Toggle Buffer Diagnostics" })
map("n", "<leader>T", "<cmd>ToggleTerm<CR>", { desc = "Toggle Terminal Panel" })

-- File Saving
map("n", "<leader>w", "<cmd>w<CR>", { desc = "Save File" })

-- Avoid copy on delete
map({ "n", "v" }, "d", '"_d', { noremap = true })
map({ "n", "v" }, "x", '"_x', { noremap = true })
map({ "n", "v" }, "D", '"_D', { noremap = true })
map({ "n", "v" }, "c", '"_c', { noremap = true })
map({ "n", "v" }, "C", '"_C', { noremap = true })

map({ "n", "v" }, "y", '"+y', { noremap = true })
map("n", "Y", '"+Y', { noremap = true })

-- Indentation Management
map("v", "<Tab>", ">gv", { noremap = true, silent = true, desc = "Indent selection" })
map("v", "<S-Tab>", "<gv", { noremap = true, silent = true, desc = "Dedent selection" })

-- Buffer Navigation
map("n", "<leader>bp", "<cmd>BufferLinePick<CR>", { desc = "Buffer Pick" })
map("n", "<leader>bd", "<cmd>b# | bd#<CR>", { desc = "Delete Current Buffer" })

-- Terminal Management
map("t", "<Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Lsp Actions
map("n", "<leader>la", "<cmd>Lspsaga code_action<CR>", { desc = "Open Code Actions" })
map("n", "<leader>ld", "<cmd>Lspsaga hover_doc<CR>", { desc = "Open Documentation" })
map("n", "<leader>lr", "<cmd>Lspsaga rename<CR>", { desc = "Rename Symbol" })

-- Surround Mappings
map("x", '"', '<Plug>(operator-sandwich-add)"', { silent = true })
map("x", "(", "<Plug>(operator-sandwich-add)(", { silent = true })
map("x", ")", "<Plug>(operator-sandwich-add))", { silent = true })

-- Trouble Mappings
map("n", "<leader>xX", "<cmd>Trouble diagnostics toggle<cr>", { desc = "Toggle Global Diagnostics" })
map("n", "<leader>xL", "<cmd>Trouble loclist toggle<cr>", { desc = "Location List (Trouble)" })
map("n", "<leader>xQ", "<cmd>Trouble qflist toggle<cr>", { desc = "Quickfix List (Trouble)" })

-- Git Mappings
map("n", "<leader>gd", function() require("mini.diff").toggle_overlay(0) end, { desc = "Toggle Git Diff" })
map("n", "<leader>gg", function() require("neogit").open() end, { desc = "Open Neogit UI" })
