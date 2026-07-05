#!/bin/bash
cd /workspaces/webtools/packages/webtest

# Run remaining tests individually with proper timeout
tests=(
  "__test__/webpaper/registry.test.ts"
  "__test__/webpaper/settings_utils.test.ts"
  "__test__/webpaper/transform_utils.test.ts"
  "__test__/webpaper/widget_dynamic_form.test.tsx"
  "__test__/webpaper/ProviderManager.test.ts"
  "__test__/webpaper/provider.history.test.ts"
  "__test__/webpaper/recordStore.test.ts"
  "__test__/webpaper/widget.autoHide.test.tsx"
  "__test__/webpaper/font_picker.test.ts"
)

for t in "${tests[@]}"; do
  echo "=== $t ==="
  timeout 40 npx vitest run --testTimeout=5000 "$t" 2>&1 | grep -E "✓|×|↓|Tests |Test Files " | head -30
  echo "---EXIT: $?---"
  pkill -9 -f vitest 2>/dev/null
  sleep 1
done
echo "=== ALL DONE ==="
