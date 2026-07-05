#!/bin/bash
cd /workspaces/webtools/packages/webtest

tests=(
  "__test__/webpaper/font_picker.test.ts"
  "__test__/webpaper/hero.image.test.tsx"
  "__test__/webpaper/overlay_commands.test.ts"
  "__test__/webpaper/registry.test.ts"
  "__test__/webpaper/settings_utils.test.ts"
  "__test__/webpaper/transform_utils.test.ts"
  "__test__/webpaper/useFetch.test.tsx"
  "__test__/webpaper/use_local_fonts.test.tsx"
  "__test__/webpaper/use_playback_scheduler.test.tsx"
  "__test__/webpaper/widget.autoHide.test.tsx"
  "__test__/webpaper/widget_dynamic_form.test.tsx"
  "__test__/webpaper/ProviderManager.test.ts"
  "__test__/webpaper/provider.history.test.ts"
  "__test__/webpaper/recordStore.test.ts"
  "__test__/webpaper/image_virtual_grid.test.tsx"
  "__test__/webwidget/font_picker.test.ts"
  "__test__/webwidget/overlay_commands.test.ts"
  "__test__/webwidget/registry.test.ts"
  "__test__/webwidget/settings_utils.test.ts"
  "__test__/webwidget/transform_utils.test.ts"
  "__test__/webwidget/use_local_fonts.test.tsx"
  "__test__/webwidget/use_playback_scheduler.test.tsx"
  "__test__/webwidget/widget.autoHide.test.tsx"
)

for t in "${tests[@]}"; do
  echo "=== $t ==="
  timeout 15 npx vitest run "$t" --reporter=verbose 2>&1 | tail -15
  code=$?
  if [ $code -eq 124 ]; then
    echo "TIMEOUT after 15s"
  fi
  pkill -9 -f "vitest" 2>/dev/null
  sleep 1
done
echo "=== ALL DONE ==="
