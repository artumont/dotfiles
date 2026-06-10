local map = vim.keymap.set
local del = vim.keymap.del

-- UI Toggles
map("n", "<leader>E", "<cmd>Neotree toggle<CR>", { desc = "Toggle File Explorer" })
map("n", "<leader>G", "<cmd>Neotree git_status toggle<CR>", { desc = "Toggle Git Explorer" })

-- File saving
map("n", "<leader>w", "<cmd>w<CR>", { desc = "Save File" })

-- Avoid copy on delete
map("v", "x", '"_x', { noremap = true })
map("v", "d", '"_d', { noremap = true })
map("n", "x", '"_x', { noremap = true })
map("n", "d", '"_d', { noremap = true })

-- Indentation management
map("v", "<Tab>", ">gv", { noremap = true, silent = true, desc = "Indent selection" })
map("v", "<S-Tab>", "<gv", { noremap = true, silent = true, desc = "Dedent selection" })

-- Buffer Navigation
map('n', '<leader>bp', '<cmd>BufferLinePick<CR>', { desc = 'Buffer Pick' })
map("n", "<leader>bd", "<cmd>b# | bd#<CR>", { desc = "Delete Current Buffer" })
