
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
}

export const FARE_RULES_SCHEMA: ToolDefinition = {
    name: "search_fare_rules",
    description: "Search for official fare rules, ticket prices, age categories (child/infant), and discount passes (e.g., JR Pass, Subway Ticket).",
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The specific question about fares or tickets (e.g., 'Child fare age limit', 'JR Pass validity')."
            }
        },
        required: ["query"]
    }
};

export const ACCESSIBILITY_SCHEMA: ToolDefinition = {
    name: "get_accessibility_info",
    description: "Retrieve accessibility information for a station, including elevator locations, step-free routes, and barrier-free facilities.",
    parameters: {
        type: "object",
        properties: {
            station_id: {
                type: "string",
                description: "The station ID or name to query. If not provided, defaults to the current station."
            },
            need_elevator: {
                type: "boolean",
                description: "Whether the user specifically needs an elevator route."
            }
        }
    }
};

export const LUGGAGE_SCHEMA: ToolDefinition = {
    name: "check_luggage_storage",
    description: "Check availability of coin lockers and luggage storage services at a station.",
    parameters: {
        type: "object",
        properties: {
            station_id: {
                type: "string",
                description: "The station ID or name. Defaults to current station if omitted."
            },
            size: {
                type: "string",
                enum: ["small", "medium", "large", "extra_large"],
                description: "Estimated size of the luggage."
            }
        }
    }
};

export const LAST_MILE_SCHEMA: ToolDefinition = {
    name: "find_last_mile_transport",
    description: "Search for last-mile transportation options like Luup (scooters), bike rentals, or buses to a specific destination.",
    parameters: {
        type: "object",
        properties: {
            destination: {
                type: "string",
                description: "The target destination name (e.g., 'Tokyo Tower', 'Hotel Gracery')."
            },
            station_id: {
                type: "string",
                description: "Starting station. Defaults to current station."
            }
        },
        required: ["destination"]
    }
};

export const CROWD_DISPATCHER_SCHEMA: ToolDefinition = {
    name: "find_quiet_places",
    description: "Find quieter alternative spots or 'vibe-aligned' places nearby to escape the crowds.",
    parameters: {
        type: "object",
        properties: {
            current_station: {
                type: "string",
                description: "The current crowded station."
            },
            preference: {
                type: "string",
                description: "User's preference (e.g., 'cafe', 'park', 'library')."
            }
        }
    }
};
// ... existing code ...

export const EXIT_STRATEGIST_SCHEMA: ToolDefinition = {
    name: "find_best_exit",
    description: "Determine the optimal station exit for a specific destination (landmark, hotel, etc.) to minimize walking or avoid crowds.",
    parameters: {
        type: "object",
        properties: {
            destination: {
                type: "string",
                description: "The name of the destination (e.g. 'Kabukicho Tower', 'Ichiran Ramen')."
            },
            station_id: {
                type: "string",
                description: "The station ID. Defaults to current station."
            },
            needs_elevator: {
                type: "boolean",
                description: "Whether an elevator exit is required."
            }
        },
        required: ["destination"]
    }
};

export const LOCAL_GUIDE_SCHEMA: ToolDefinition = {
    name: "local_guide_recommendation",
    description: "Provide personalized recommendations for food, shopping, or spots near a station.",
    parameters: {
        type: "object",
        properties: {
            category: {
                type: "string",
                description: "Type of recommendation (e.g. 'ramen', 'cafe', 'shopping', 'hidden gem')."
            },
            station_id: {
                type: "string",
                description: "The station to search around."
            },
            vibe: {
                type: "string",
                description: "Desired atmosphere (e.g. 'quiet', 'lively', 'cheap', 'fancy')."
            }
        },
        required: ["category"]
    }
};

export const MEDICAL_SCHEMA: ToolDefinition = {
    name: "find_medical_assistance",
    description: "Provide medical assistance info, emergency numbers, or nearby clinic types based on symptoms.",
    parameters: {
        type: "object",
        properties: {
            symptom: {
                type: "string",
                description: "User's described symptom (e.g. 'fever', 'stomach ache', 'lost medicine')."
            },
            urgency: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Estimated urgency."
            }
        },
        required: ["symptom"]
    }
};

