local map = vim.keymap.set
local del = vim.keymap.del

-- UI Toggles
map("n", "<leader>E", "<cmd>Neotree toggle<CR>", { desc = "Toggle File Explorer" })
map("n", "<leader>G", "<cmd>Neotree git_status toggle<CR>", { desc = "Toggle Git Explorer" })
map("n", "<leader>C", "<cmd>ToggleTerm<CR>", { desc = "Toggle Terminal Panel" })

-- File saving
map("n", "<leader>w", "<cmd>w<CR>", { desc = "Save File" })

-- Avoid copy on delete
map({ "n", "v" }, "d", '"_d', { noremap = true })
map({ "n", "v" }, "x", '"_x', { noremap = true })
map({ "n", "v" }, "D", '"_D', { noremap = true })
map({ "n", "v" }, "c", '"_c', { noremap = true })
map({ "n", "v" }, "C", '"_C', { noremap = true })

map({ "n", "v" }, "y", '"+y', { noremap = true })
map("n", "Y", '"+Y', { noremap = true })

-- Indentation management
map("v", "<Tab>", ">gv", { noremap = true, silent = true, desc = "Indent selection" })
map("v", "<S-Tab>", "<gv", { noremap = true, silent = true, desc = "Dedent selection" })

-- Buffer Navigation
map("n", "<leader>bp", "<cmd>BufferLinePick<CR>", { desc = "Buffer Pick" })
map("n", "<leader>bd", "<cmd>b# | bd#<CR>", { desc = "Delete Current Buffer" })
