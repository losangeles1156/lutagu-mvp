---
name: deep-research
description: A suite of vector-powered research skills for solving complex transit scenarios (Accessibility, Vibe Matching, Last Mile).
allowed-tools:
  - mcp_supabase-mcp-server_execute_sql
  - mcp_supabase-mcp-server_search_docs
tags:
  - deep-research
  - strategy
  - vector-search
---

# Deep Research Skills

This skill set enables the agent to perform "Deep Research" into specific transit domains using semantic search and vector matching.

## Included Strategies

| Strategy | Goal | File |
| :--- | :--- | :--- |
| **Vibe Matcher** | Find places with similar atmosphere but less crowded. | `reference/vibe-matcher.md` |
| **Facility Pathfinder** | Detailed vertical navigation for stroller/wheelchair. | `reference/facility-pathfinder.md` |
| **Last Mile Connector** | Solve the "Station to Final Destination" gap (>1km). | `reference/last-mile-connector.md` |
| **Spatial Reasoner** | Calculate alternative routes during train suspension. | `reference/spatial-reasoner.md` |

## Usage Principles

*   **Vector First**: These skills rely on `vibe_embedding` or facility graph data, necessitating vector search or specialized graph queries.
*   **Prompt Engineering**: Each strategy defines specific JSON output formats and persona tones (e.g., "Guardian" for accessibility).
