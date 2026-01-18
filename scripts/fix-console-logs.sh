#!/bin/bash

# Fix Console Logs Script
# Replaces console.* calls with logger.* in TypeScript/React files
# Usage: bash scripts/fix-console-logs.sh

set -e

echo "🔧 Starting console.log cleanup..."
echo ""

# Counter
count=0

# Find all TypeScript/React files
find src -name "*.ts" -o -name "*.tsx" | while read -r file; do
  # Check if file contains console calls
  if grep -q "console\.\(log\|error\|warn\|debug\|info\)" "$file" 2>/dev/null; then

    # Skip if logger is already imported
    if grep -q "logger" "$file"; then
      # Just replace console calls
      perl -pi -e 's/console\.log\(/logger.log(/g' "$file"
      perl -pi -e 's/console\.error\(/logger.error(/g' "$file"
      perl -pi -e 's/console\.warn\(/logger.warn(/g' "$file"
      perl -pi -e 's/console\.debug\(/logger.debug(/g' "$file"
      perl -pi -e 's/console\.info\(/logger.info(/g' "$file"
      echo "✓ Updated (logger exists): $file"
    else
      # Add import and replace calls
      # Find the line number of the last import
      last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

      if [ -n "$last_import" ]; then
        # Insert logger import after last import
        perl -i -pe "print \"import { logger } from '\@/lib/utils/logger';\n\" if $. == $last_import + 1" "$file"

        # Replace console calls
        perl -pi -e 's/console\.log\(/logger.log(/g' "$file"
        perl -pi -e 's/console\.error\(/logger.error(/g' "$file"
        perl -pi -e 's/console\.warn\(/logger.warn(/g' "$file"
        perl -pi -e 's/console\.debug\(/logger.debug(/g' "$file"
        perl -pi -e 's/console\.info\(/logger.info(/g' "$file"

        echo "✓ Updated (added import): $file"
      else
        echo "⚠ Skipped (no imports found): $file"
      fi
    fi

    ((count++))
  fi
done

echo ""
echo "✅ Console cleanup complete! Updated $count files."
echo ""
echo "Next steps:"
echo "1. Run: npm run typecheck"
echo "2. Run: npm run lint"
echo "3. Test the application"
