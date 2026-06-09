local map = vim.keymap.set
local del = vim.keymap.del

local function close_buffer_or_dashboard()
  local buffers = vim.fn.getbufinfo({ buflisted = 1 })
  
  if #buffers <= 1 then
    Snacks.bufdelete()
    require("edgy").open()
  else
    Snacks.bufdelete()
  end
end

map({ "n", "i", "v" }, "<C-s>", "<cmd>w<CR>", { desc = "Save file" })

map("v", "<C-c>", '"+y', { desc = "Copy to System Clipboard" })
map("i", "<C-v>", "<C-r>+", { desc = "Paste from System Clipboard" })
map("v", "<C-v>", '"+P', { desc = "Paste Over Selection" })
map("i", "<C-v>", "<C-r>+", { noremap = true, silent = true, desc = "Paste from system clipboard" })
map("c", "<C-v>", "<C-r>+", { noremap = true, silent = true, desc = "Paste from system clipboard" })
map("t", "<C-S-v>", [[<C-\><C-n>"+pi]], { noremap = true, silent = true, desc = "Paste into terminal" })

map("n", "<C-Right>", "e", { desc = "Jump to end of word" })
map("i", "<C-Right>", "<C-o>e<Right>", { desc = "Jump to end of word" })

map("n", "<C-Left>", "b", { desc = "Jump to start of word" })
map("i", "<C-Left>", "<C-o>b", { desc = "Jump to start of word" })

map("n", "<C-w>", close_buffer_or_dashboard, { desc = "Close buffer or show dashboard" })
map("i", "<C-w>", function()
  vim.cmd("stopinsert")
  close_buffer_or_dashboard()
end, { desc = "Close buffer or show dashboard from Insert Mode" })

map({ "n", "i" }, "<C-l>", function()
  if vim.api.nvim_get_mode().mode == "i" then vim.cmd "stopinsert" end
  vim.cmd "normal! ^v$"
end, { desc = "Select line without auto-copy" })

map("i", "<C-Backspace>", "<C-w>", { desc = "Delete word backward" })

map({ "n", "i" }, "<C-z>", "<Cmd>undo<CR>", { desc = "Undo Last Action" })
map("n", "<C-y>", "<C-r>", { desc = "Redo Last Action" })
map("i", "<C-y>", "<C-o><C-r>", { desc = "Redo inside Insert Mode", silent = true })

map("n", "<A-Left>", "<C-w>h", { desc = "Go to Left Window Split" })
map("n", "<A-Down>", "<C-w>j", { desc = "Go to Lower Window Split" })
map("n", "<A-Up>", "<C-w>k", { desc = "Go to Upper Window Split" })
map("n", "<A-Right>", "<C-w>l", { desc = "Go to Right Window Split" })

map({ "n", "i", "v" }, "<C-a>", "<Esc>ggVG", { desc = "Select whole file" })
map("v", "<BS>", "c", { noremap = true, silent = true, desc = "Delete selection inside v-line" })

map("n", "<F12>", vim.lsp.buf.definition, { desc = "LSP Go to Definition (VS Code style)" })

map("n", "<C-`>", "<cmd>ToggleTerm<CR>", { desc = "Toggle Terminal" })

map("t", "<Esc>", "<C-\\><C-n>", { desc = "Exit Terminal Mode" })

map("v", "<C-x>", '"+x', { desc = "Cut to System Clipboard", noremap = true, silent = true })

map("n", "<C-.>", "<cmd>bnext<CR>", { silent = true, desc = "Next Buffer" })

map("n", "<C-,>", "<cmd>bprevious<CR>", { silent = true, desc = "Next Buffer" })

map("n", "<leader>ts", function()
  local count = #require("toggleterm.terminal").get_all() + 1
  require("toggleterm").toggle(count, nil, nil, "vertical")
end, { noremap = true, silent = true, desc = "Split terminal panel" })

map(
  { "n", "i" },
  "<C-f>",
  function() require("telescope.builtin").current_buffer_fuzzy_find() end,
  { desc = "Fuzzy search current file" }
)

map("v", "<C-f>", function()
  vim.cmd 'normal! "vy'
  local selection = vim.fn.getreg "v"
  require("telescope.builtin").current_buffer_fuzzy_find {
    default_text = selection,
  }
end, { desc = "Fuzzy search selection in current file" })

map("v", "<A-Up>", ":move '<-2<CR>gv=gv", { desc = "Move selected lines up", silent = true, noremap = true })
map("v", "<A-Down>", ":move '>+1<CR>gv=gv", { desc = "Move selected lines down", silent = true, noremap = true })

del("n", "<C-Up>")

del("n", "<C-Down>")
