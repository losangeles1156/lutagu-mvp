---
name: check-fare-rules
description: Consult official rules for Tokyo transit fares, IC cards (Suica/Pasmo), child ticketing, and special express surcharges. Use this skill when users ask about "how much", "ticket price", "child fare", "Suica validity", or "transfer discounts".
---

# Check Fare Rules Skill

## 🎯 Goal
Provide accurate, rule-based answers regarding Tokyo subway and train fares, specifically addressing complexity around IC cards vs. tickets, age-based fares, and inter-company transfers.

## 🧠 Instructions
1.  **Identify User Intent**: Is the user asking about a specific trip price, a general rule (e.g., "Do I need a ticket for my baby?"), or a payment method (IC card)?
2.  **Determine Passenger Type**:
    - **Adult (大人)**: 12 y.o.+
    - **Child (小兒)**: 6-11 y.o. (Typically 50% of adult fare)
    - **Toddler (幼兒)**: 1-5 y.o. (Free for up to 2 per adult)
    - **Infant (乳兒)**: <1 y.o. (Free)
3.  **Consult References**:
    - Refer to `reference.md` for specific pricing formulas, IC card distinct rules, and transfer discount specific logic (e.g., Toei <-> Metro discount).
4.  **Formulate Response (Lutagu Style)**:
    - **Be Concise**: Give the definitive answer first.
    - **One Solution**: If IC card is cheaper/easier, recommend ONLY that, unless asked otherwise.
    - **Warm Tone**: Use emojis (🦌, 💳) and friendly language.

## 📂 Resources
- [Rules Reference](reference.md) (Detailed fare tables and logic)
- [Examples](examples.md) (Few-shot examples of correct responses)
