local M = {}

function M.switch()
  local ok, mini = pcall(require, "mini.icons")
  local function get_icon(buf)
    if not ok then return "" end
    local ft = vim.bo[buf].filetype
    local name = vim.fn.bufname(buf)
    local icon = mini.get("filetype", ft)
    if not icon or icon == "" then icon = mini.get("file", name) end
    return icon and (icon .. " ") or ""
  end

  local function get_mru_buffers()
    local bufs = {}
    for _, buf in ipairs(vim.fn.getbufinfo { buflisted = 1, bufloaded = 1 }) do
      if vim.bo[buf.bufnr].buftype == "" then table.insert(bufs, buf) end
    end
    table.sort(bufs, function(a, b) return a.lastused > b.lastused end)
    return bufs
  end

  local bufs = get_mru_buffers()
  if #bufs == 0 then return end

  local lines = {}
  local bufnrs = {}
  for i, buf in ipairs(bufs) do
    local name = vim.fn.fnamemodify(buf.name, ":~:.")
    if name == "" then name = "[No Name]" end
    lines[i] = " " .. get_icon(buf.bufnr) .. name
    bufnrs[i] = buf.bufnr
  end

  local current_buf = vim.api.nvim_get_current_buf()
  local idx = 1
  for i, b in ipairs(bufnrs) do
    if b == current_buf then
      idx = i
      break
    end
  end

  local width = 0
  for _, l in ipairs(lines) do
    if #l > width then width = #l end
  end
  width = math.min(width + 4, math.floor(vim.o.columns * 0.6))
  local height = math.min(#lines, 20)

  local ns = vim.api.nvim_create_namespace "btab"
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].buftype = "nofile"
  vim.bo[buf].bufhidden = "wipe"

  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = width,
    height = height,
    row = math.floor((vim.o.lines - height) / 2) - 1,
    col = math.floor((vim.o.columns - width) / 2),
    style = "minimal",
    border = "rounded",
    title = " Buffers ",
    title_pos = "center",
  })

  local function render()
    local display_lines = {}
    local start = 1
    if #lines > height then
      start = math.max(1, idx - math.floor(height / 2))
      if start + height - 1 > #lines then start = #lines - height + 1 end
    end
    for i = start, math.min(start + height - 1, #lines) do
      local prefix = i == idx and "▶ " or "  "
      display_lines[#display_lines + 1] = prefix .. lines[i]
    end
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, display_lines)
    vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
    local hl_line = idx - start
    vim.api.nvim_buf_add_highlight(buf, ns, "CursorLine", hl_line, 0, -1)
    vim.api.nvim_win_set_cursor(win, { hl_line + 1, 0 })
  end

  render()

  local function close()
    if vim.api.nvim_win_is_valid(win) then vim.api.nvim_win_close(win, true) end
    if vim.api.nvim_buf_is_valid(buf) then vim.api.nvim_buf_delete(buf, { force = true }) end
  end

  local function select()
    local target = bufnrs[idx]
    close()
    if target and vim.api.nvim_buf_is_valid(target) then vim.api.nvim_set_current_buf(target) end
  end

  local function cycle(dir)
    idx = idx + dir
    if idx > #bufnrs then idx = 1 end
    if idx < 1 then idx = #bufnrs end
    render()
  end

  local function delete()
    local target = bufnrs[idx]
    if not target or not vim.api.nvim_buf_is_valid(target) then return end
    local bd = require("mini.bufremove").delete
    bd(target, false)
    table.remove(bufs, idx)
    table.remove(lines, idx)
    table.remove(bufnrs, idx)
    if #bufnrs == 0 then
      close()
      return
    end
    if idx > #bufnrs then idx = #bufnrs end
    render()
  end

  local map_opts = { noremap = true, silent = true, nowait = true, buffer = buf }
  vim.keymap.set("n", "<Down>", function() cycle(1) end, map_opts)
  vim.keymap.set("n", "<Up>", function() cycle(-1) end, map_opts)
  vim.keymap.set("n", "<CR>", select, map_opts)
  vim.keymap.set("n", "<2-LeftMouse>", select, map_opts)
  vim.keymap.set("n", "j", function() cycle(1) end, map_opts)
  vim.keymap.set("n", "k", function() cycle(-1) end, map_opts)
  vim.keymap.set("n", "<Esc>", close, map_opts)
  vim.keymap.set("n", "q", delete, map_opts)
end

return M
