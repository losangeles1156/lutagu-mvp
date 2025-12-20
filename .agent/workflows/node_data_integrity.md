---
description: Process for verifying node data integrity and preventing cross-contamination.
---

# Node Data Integrity & Classification Workflow

## 1. Principles of Data Isolation

To prevent data from Station A appearing in Station B:

1.  **Unique Identifiers (Primary Key)**
    - Every node must have a strict, unique `id` following the ODPT format: `odpt:Station:<Operator>.<Line>.<Name>`.
    - **Rule**: No two nodes can share the same ID.

2.  **Profile Mapping (Foreign Key)**
    - Data in `mockProfiles` (or the database `node_facility_profiles`) must be linked via **Exact Match** of the Node ID or a unique, non-overlapping English Name key.
    - **Anti-Pattern**: Avoid loose `includes()` matching that could cause overlaps (e.g., matching "Ueno" might accidentally match "Ueno-hirokoji" if not careful).

3.  **Content Uniqueness**
    - **Narratives**: Each station must have a unique description. Copy-pasting descriptions is forbidden without immediate modification.
    - **Facilities**: Facility IDs must be prefixed with the station code (e.g., `u-t-1` for Ueno, `a-t-1` for Asakusa) to prevent ID collisions.

## 2. Verification Process

Before committing any new node data:

### Step A: Static Analysis
Run the verification script:
```bash
npx tsx scripts/verify_node_data.ts
```
**Checks performed:**
- [ ] **Duplicate IDs**: Are there any repeated IDs in `seedNodes.ts`?
- [ ] **Profile Orphans**: Are there profiles in `nodes.ts` that don't match any seed node?
- [ ] **Ambiguous Mapping**: Will a profile key match multiple nodes? (e.g. 'Ginza' matching 'Higashi-Ginza')
- [ ] **Data Duplication**: Are `vibe_tags` or `category_counts` identical between two different stations? (indicating a copy-paste error)

### Step B: Manual Review
1.  **Check Key Names**: Ensure the keys in `mockProfiles` specific enough.
    - *Bad*: `'Nihombashi'` (Might match `Higashi-Nihombashi`)
    - *Good*: `'Nihombashi'` (if logic ensures exact match) or `'Station:Nihombashi'`
2.  **Check Facility Prefixes**: Ensure facility definitions use the correct station prefix.
    - Ueno -> `u-`
    - Asakusa -> `as-` (or `a-`)
    - Akihabara -> `ak-`

## 3. Correction Protocol

If a data collision is found:
1.  **Isolate**: Identify the overlapping keys.
2.  **Rename**: Change the strictly matched key in `mockProfiles` to be more specific (e.g. change key from `Okachimachi` to `JR-East.Okachimachi` if needed for precision).
3.  **Refactor**: Update the fetching logic in `nodes.ts` to respect the stricter keys.
