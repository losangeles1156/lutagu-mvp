/**
 * L3 Graph Builder (Synthetic Data Generator for MVP)
 * 
 * Generates tagged L3 topology for key stations.
 * Focuses on creating "High Resistance" vs "Low Resistance" paths
 * to maximize the value of the tagging system.
 */

import { L3StationGraph, L3Node, L3Edge, L3NodeType, L3EdgeType } from './types/L3Topology';

export class L3GraphBuilder {

    /**
     * Generates a detailed, tagged graph for Ueno Station.
     * Scenario: Park Gate (Upper) vs Main Gate (Lower) vs Subway connections.
     */
    static buildUenoGraph(): L3StationGraph {
        const stationId = "odpt.Station:JR-East.Yamanote.Ueno";

        const nodes: L3Node[] = [
            // Platforms
            { id: "Ueno.Platform.1", stationId, type: "platform", level: 2, tags: ["yamanote_inner", "crowded"] },
            { id: "Ueno.Platform.2", stationId, type: "platform", level: 2, tags: ["yamanote_outer"] },

            // Concourses
            { id: "Ueno.Concourse.Central", stationId, type: "ticket_gate", level: 1, tags: ["main_transit", "WIDE_GATES", "HIGH_CEILING"] },
            { id: "Ueno.Concourse.Park", stationId, type: "ticket_gate", level: 3, tags: ["park_access", "art_museums", "NATURAL_LIGHT", "WOODEN_DECOR"] },

            // Exits
            { id: "Ueno.Exit.Isheru", stationId, type: "exit", level: 1, tags: ["central_exit", "taxi_stand", "BUSY_STREET"] },
            { id: "Ueno.Exit.Park", stationId, type: "exit", level: 3, tags: ["ueno_park", "zoo", "GREEN_VIEW", "WIDE_OPEN"] },

            // Facilities
            { id: "Ueno.Elevator.Central", stationId, type: "elevator_hall", level: 1, tags: ["capacity_large", "BRIGHT_LIGHTING"] },
            { id: "Ueno.Elevator.Platform1", stationId, type: "elevator_hall", level: 2, tags: ["platform_access"] }
        ];

        const edges: L3Edge[] = [
            // 1. Central Gate to Platform 1 (Stairs - High Resistance)
            {
                fromNodeId: "Ueno.Concourse.Central",
                toNodeId: "Ueno.Platform.1",
                type: "stairs",
                distanceMeters: 30,
                durationSeconds: 45,
                tags: ["stairs", "no_escalator_down", "NARROW", "CROWDED_PEAK"],
                resistanceScore: 80, // Painful for luggage/wheelchair
                isWheelchairAccessible: false, // Critical tag
                isStrollerAccessible: false
            },

            // 2. Central Gate to Platform 1 (Elevator - Low Resistance)
            {
                fromNodeId: "Ueno.Concourse.Central",
                toNodeId: "Ueno.Elevator.Central",
                type: "walk",
                distanceMeters: 50,
                durationSeconds: 40,
                tags: ["flat", "wide", "MODERN_FLOOR", "CLEAR_SIGNAGE"],
                resistanceScore: 10,
                isWheelchairAccessible: true,
                isStrollerAccessible: true
            },
            {
                fromNodeId: "Ueno.Elevator.Central",
                toNodeId: "Ueno.Elevator.Platform1",
                type: "elevator",
                distanceMeters: 0,
                durationSeconds: 30, // Wait time included
                tags: ["elevator", "priority"],
                resistanceScore: 5,
                isWheelchairAccessible: true,
                isStrollerAccessible: true
            },
            {
                fromNodeId: "Ueno.Elevator.Platform1",
                toNodeId: "Ueno.Platform.1",
                type: "walk",
                distanceMeters: 10,
                durationSeconds: 10,
                tags: ["flat"],
                resistanceScore: 5,
                isWheelchairAccessible: true,
                isStrollerAccessible: true
            },

            // 3. Park Gate (High Level) connection
            {
                fromNodeId: "Ueno.Platform.1",
                toNodeId: "Ueno.Concourse.Park",
                type: "escalator",
                distanceMeters: 40,
                durationSeconds: 60,
                tags: ["escalator_up_only"],
                resistanceScore: 30,
                isWheelchairAccessible: false, // Escalator not wheelchair friendly usually
                isStrollerAccessible: false // Safety rule
            },
            {
                fromNodeId: "Ueno.Concourse.Park",
                toNodeId: "Ueno.Exit.Park",
                type: "walk",
                distanceMeters: 20,
                durationSeconds: 20,
                tags: ["flat", "scenic"],
                resistanceScore: 10,
                isWheelchairAccessible: true,
                isStrollerAccessible: true
            }
        ];

        const nodeMap = new Map<string, L3Node>();
        nodes.forEach(n => nodeMap.set(n.id, n));

        return {
            stationId,
            nodes: nodeMap,
            edges
        };
    }
}
