dofile "/etc/xdg/luakit/rc.lua"

-- ── Lazy.luakit Bootstrap ────────────────────────────────────────────────────

local lazy_path = luakit.data_dir .. "/lazy/lazy.luakit"
if not lfs.attributes(lazy_path) then
  os.execute(
    string.format(
      "git clone --filter=blob:none --branch=stable %q %q",
      "https://github.com/artumont/lazy.luakit.git",
      lazy_path
    )
  )
  if not lfs.attributes(lazy_path) then error "failed to bootstrap lazy.luakit" end
end

-- ── Package Dir Inclusion ────────────────────────────────────────────────────

local config_lua = luakit.config_dir .. "/lua"
package.path = config_lua .. "/?.lua;" .. config_lua .. "/?/init.lua;" .. package.path

local lazy_lua = lazy_path .. "/lua"
package.path = lazy_lua .. "/?.lua;" .. lazy_lua .. "/?/init.lua;" .. package.path

require "config.options"
require "lazy_setup"
