---
description: Standard process for personifying a new station node (L1-L4).
---

1. **Research & Concept**
   - Identify the station's core identity (e.g., "The Kitchen Town", "The Electrical City").
   - Determine L1 DNA: Vibe tags, dominant categories.
   - Identify L3 Facilities: Real-world spots (toilets, lockers, famous shops).
   - Define L4 Strategy: Insider tips or "traps" (transfer warnings, exits).

2. **Implementation (Data)**
   - Edit `src/lib/api/nodes.ts`.
   - Add entry to `mockProfiles`.
   - Ensure `category_counts`, `vibe_tags`, `l3_facilities`, `l4_nudges` are complete.

3. **Implementation (UI)**
   - Edit `src/components/node/NodeTabs.tsx`.
   - Add a conditional check for the node name.
   - Write a poetic/emotional description (Client-side narrative).

4. **Verification**
   - Verify syntax in `nodes.ts`.
   - Check `NodeTabs.tsx` JSX structure.
   - Update `task.md` and `walkthrough.md`.

5. **Commit**
   - Use `/deploy_to_github` to save changes.
