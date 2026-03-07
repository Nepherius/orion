#!/usr/bin/env bash
set -euo pipefail

run_tauri_dev() {
  if [[ -x "./node_modules/.bin/tauri" ]]; then
    exec ./node_modules/.bin/tauri dev
  fi

  exec npx tauri dev
}

if [[ "${1:-}" == "--inner" ]]; then
  run_tauri_dev
fi

if [[ "$(uname -s)" == "Linux" ]]; then
  CLEAN_XDG_DATA_DIRS="/usr/local/share:/usr/share"
  REAL_HOME="$(getent passwd "$(id -un)" | cut -d: -f6)"

  exec env \
    -u LD_LIBRARY_PATH \
    -u LD_PRELOAD \
    -u LIBRARY_PATH \
    -u LD_AUDIT \
    -u LD_DEBUG \
    -u GI_TYPELIB_PATH \
    -u GIO_EXTRA_MODULES \
    -u GST_PLUGIN_PATH \
    -u GST_PLUGIN_SYSTEM_PATH \
    -u GST_PLUGIN_SYSTEM_PATH_1_0 \
    -u GTK_MODULES \
    -u GTK_IM_MODULE \
    -u GTK_PATH \
    -u QT_IM_MODULE \
    -u QT_PLUGIN_PATH \
    -u SNAP \
    -u SNAP_NAME \
    -u SNAP_REVISION \
    -u SNAP_ARCH \
    -u SNAP_COMMON \
    -u SNAP_DATA \
    -u SNAP_LIBRARY_PATH \
    -u SNAP_INSTANCE_NAME \
    -u SNAP_USER_COMMON \
    -u SNAP_USER_DATA \
    XDG_DATA_DIRS="$CLEAN_XDG_DATA_DIRS" \
    XDG_DATA_HOME="$REAL_HOME/.local/share" \
    XDG_CONFIG_HOME="$REAL_HOME/.config" \
    XDG_CACHE_HOME="$REAL_HOME/.cache" \
    XDG_STATE_HOME="$REAL_HOME/.local/state" \
    WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 \
    HOME="$REAL_HOME" \
    PATH="$PATH" \
    bash -lc 'cd "'"$PWD"'" && ./scripts/tauri-dev-linux-safe.sh --inner'
fi

run_tauri_dev