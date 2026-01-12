
# Last Mile Connector Skill (Policy: Traffic Vacuum)

## 🎯 Goal
Bridge the gap between stations and final destinations that are outside comfortable walking distance (>800m), addressing the "Traffic Vacuum" policy issue.

## 🚦 Trigger Conditions
- **Intent**: Getting to a specific destination far from the station.
- **Keywords**: "far", "walk", "bus", "remote", "how to get to", "遠", "走路", "公車", "巴士", "交通不便", "難去"
- **Context**: Calculated walking time > 15 minutes OR distance > 1.2km.

## 🧠 Core Logic
1. **Analyze Distance**: Compute logic distance from current station exit to target ROI.
2. **identify Gap**: If walk > 15min, flag as "Traffic Vacuum".
3. **Search Micro-Mobility**:
    - Query **Community Bus (One-Coin Bus)** schedules.
    - Check **Luup (E-Scooter)** port availability near station and destination.
    - Check **Taxi** stand wait times.
4. **Formulate Hybrid Route**: "Train -> Station -> [Luup/Bus] -> Destination".

## 📡 Demand Signal
- If user accepts suggestion -> Record `traffic_vacuum` signal `unmet_need=false`.
- If no micro-mobility available -> Record `traffic_vacuum` signal `unmet_need=true` (Policy Insight for Govt).

## 🗣️ Response Template
> "To reach [Destination], it's a bit of a hike (20 mins walk). 🚌
> I recommend taking the **Hachiko Bus** from **Exit South** (¥100) or grabbing a **Luup** scooter at the port near the exit. It cuts the trip to 5 mins! 🛴"
