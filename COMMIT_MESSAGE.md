# Git Commit 建議

## Commit Message

```
feat(map): enhance hub node visual hierarchy with dynamic sizing

- Increase hub marker size from 56px to 64px at zoom < 14 (+14.3%)
- Reduce regular station marker size from 32px to 28px at zoom < 14 (-12.5%)
- Improve hub icon size from 26px to 28px at low zoom for better visibility
- Reduce regular icon size from 16px to 14px at low zoom to minimize clutter
- Add detailed comments explaining progressive label disclosure strategy
- Visual contrast ratio improved from 1.75x to 2.29x (+30.9%)

This optimization resolves the "hub node marginalization" issue where
important transfer hubs were not prominent enough at city-level zoom.

Files modified:
- src/components/map/NodeMarker.tsx (lines 173-186, 124-132)

Testing:
- Manual testing guide: test-screenshots/TESTING_GUIDE.md
- Code verification report: test-zoom-logic.md
- Optimization summary: OPTIMIZATION_SUMMARY.md
```

## 或者使用簡短版本

```
feat(map): enhance hub prominence at low zoom levels

- Hub markers: 56px → 64px at zoom < 14
- Regular markers: 32px → 28px at zoom < 14
- Visual contrast improved by 30.9%

Fixes hub node marginalization issue.
```

## Git 指令

```bash
# 如果要提交優化後的程式碼
git add src/components/map/NodeMarker.tsx
git commit -m "feat(map): enhance hub node visual hierarchy with dynamic sizing"

# 如果要提交測試文件
git add test-zoom-logic.md OPTIMIZATION_SUMMARY.md test-screenshots/
git commit -m "docs: add map optimization test reports and guides"
```

## 建議分成兩個 Commit

### Commit 1: 程式碼優化
```bash
git add src/components/map/NodeMarker.tsx
git commit -F- <<EOF
feat(map): enhance hub node visual hierarchy with dynamic sizing

Optimize visual prominence of hub stations at low zoom levels:
- Hub marker size: 56px → 64px (zoom < 14)
- Regular marker size: 32px → 28px (zoom < 14)
- Hub icon size: base → 28px (zoom < 14)
- Regular icon size: 16px → 14px (zoom < 14)

Results:
- Visual contrast ratio: 1.75x → 2.29x (+30.9%)
- Hub prominence significantly improved
- Map clarity enhanced at city-level zoom

This resolves the hub node marginalization issue where important
transfer hubs were not visually prominent enough compared to
regular stations when users view the city-level map.

Modified:
- src/components/map/NodeMarker.tsx: Dynamic sizing logic (L173-186)
- src/components/map/NodeMarker.tsx: Enhanced label disclosure comments (L124-132)
EOF
```

### Commit 2: 測試文件
```bash
git add test-zoom-logic.md OPTIMIZATION_SUMMARY.md test-screenshots/
git commit -F- <<EOF
docs: add comprehensive testing guide for map optimization

Add detailed documentation for hub node visual hierarchy optimization:
- test-zoom-logic.md: Technical verification report with code analysis
- OPTIMIZATION_SUMMARY.md: Visual comparison and improvement metrics
- test-screenshots/TESTING_GUIDE.md: Step-by-step manual testing guide

These documents provide:
- Before/after comparison data (+30.9% contrast improvement)
- Code location references for maintenance
- Manual testing checklist for QA
- Performance optimization measures documentation
EOF
```

---

## 推送到遠端（可選）

```bash
git push origin main
```

## 建立 Pull Request（可選）

如果使用 GitHub flow：

```bash
# 建立新分支
git checkout -b feat/map-hub-visual-hierarchy

# 提交改動
git add src/components/map/NodeMarker.tsx
git commit -m "feat(map): enhance hub node visual hierarchy"

# 推送並建立 PR
git push origin feat/map-hub-visual-hierarchy
gh pr create --title "Enhance hub node visual hierarchy" --body "Resolves hub marginalization issue..."
```

---

**注意事項**：
- 確認改動已通過手動測試再提交
- 建議先在本地測試環境驗證後再推送到遠端
- 若有 CI/CD pipeline，確認測試通過後再 merge
