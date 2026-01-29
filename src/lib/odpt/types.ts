export interface OdptRailway {
    "@id": string;
    "@type": "odpt:Railway";
    "dc:date"?: string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:lineCode"?: string;
    "odpt:color"?: string;
    "odpt:operator": string;
    "odpt:railwayTitle": {
        en?: string;
        ja?: string;
    };
    "odpt:stationOrder": {
        "odpt:index": number;
        "odpt:station": string;
        "odpt:stationTitle": {
            en?: string;
            ja?: string;
        };
    }[];
}

export interface OdptStation {
    "@id": string;
    "@type": "odpt:Station";
    "dc:date"?: string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:operator": string;
    "odpt:railway": string;
    "odpt:stationTitle": {
        en?: string;
        ja?: string;
    };
    "geo:lat"?: number;
    "geo:long"?: number;
    "odpt:stationCode"?: string;
}

export interface OdptTrainTimetable {
    "@id": string;
    "@type": "odpt:TrainTimetable";
    "odpt:train": string;
    "odpt:railway": string;
    "odpt:operator": string;
    "odpt:trainType": string;
    "odpt:trainNumber": string;
    "odpt:railDirection": string;
    "odpt:trainOwner"?: string;
    "odpt:timetableObject": {
        "odpt:departureTime"?: string;
        "odpt:arrivalTime"?: string;
        "odpt:departureStation"?: string;
        "odpt:arrivalStation"?: string;
    }[];
}

export interface OdptRailwayFare {
    "@id": string;
    "@type": "odpt:RailwayFare";
    "odpt:operator": string;
    "odpt:fromStation": string;
    "odpt:toStation": string;
    "odpt:ticketFare": number;
    "odpt:icCardFare": number;
    "odpt:trainType"?: string;
}

export interface OdptStationTimetable {
    "@id": string;
    "@type": "odpt:StationTimetable";
    "dc:date"?: string;
    "owl:sameAs": string;
    "odpt:railway": string;
    "odpt:station": string;
    "odpt:calendar": string;
    "odpt:operator": string;
    "odpt:railDirection": string;
    "odpt:stationTimetableObject": {
        "odpt:departureTime": string;
        "odpt:destinationStation"?: string[];
        "odpt:train": string;
        "odpt:isOrigin"?: boolean;
        "odpt:trainType": string;
        "odpt:trainNumber": string;
    }[];
}

export interface OdptTrainInformation {
    "@id": string;
    "@type": "odpt:TrainInformation";
    "dc:date"?: string;
    "owl:sameAs"?: string;
    "odpt:trainInformationText":
    | string
    | {
        en?: string;
        ja?: string;
        zh?: string;
        'zh-TW'?: string;
    };
    "odpt:railway": string;
    "odpt:operator": string;
    "odpt:timeOfOrigin"?: string;
    "odpt:trainInformationStatus"?:
    | string
    | {
        en?: string;
        ja?: string;
        zh?: string;
        'zh-TW'?: string;
    };
    secondary_source?: string;
    secondary_status?: string;
}

export type TransitIncidentSource = 'odpt' | 'yahoo' | 'official' | 'synthetic';

export type TransitIncidentStatus = 'normal' | 'delay' | 'suspended' | 'unknown';

export type TransitIncidentSeverity = 'none' | 'minor' | 'major' | 'critical';

export type TransitIncidentLocalizedText = {
    ja?: string;
    en?: string;
    'zh-TW'?: string;
};

export type TransitIncidentEvidence = {
    source: TransitIncidentSource;
    title?: string;
    url?: string;
    observed_at?: string;
    snippet_ja?: string;
};

export type TransitIncident = {
    id: string;
    source: TransitIncidentSource;
    operator?: string;
    railway: string;
    status: TransitIncidentStatus;
    severity: TransitIncidentSeverity;
    delay_minutes?: number | null;
    message?: TransitIncidentLocalizedText;
    occurred_at?: string | null;
    observed_at: string;
    evidence?: TransitIncidentEvidence[];
    trust_level?: 'verified' | 'unverified' | 'discrepancy';
    confidence?: number; // 0.0 to 1.0
};

export interface OdptBus {
    "@id": string;
    "@type": "odpt:Bus";
    "dc:date"?: string;
    "owl:sameAs"?: string;
    "odpt:operator"?: string;
    "odpt:busroutePattern"?: string;
    "odpt:fromBusstopPole"?: string;
    "odpt:toBusstopPole"?: string;
    "odpt:busNumber"?: string;
    "odpt:progress"?: number;
    "geo:lat"?: number;
    "geo:long"?: number;
}

export interface OdptBusroutePattern {
    "@id": string;
    "@type": "odpt:BusroutePattern";
    "dc:date"?: string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:operator"?: string;
    "odpt:busroute"?: string;
    "odpt:pattern"?: string;
    "odpt:direction"?: string;
    "odpt:kana"?: string;
    "odpt:busstopPoleOrder"?: {
        "odpt:busstopPole": string;
        "odpt:index": number;
        "odpt:note"?: string;
    }[];
}

export interface OdptBusTimetable {
    "@id": string;
    "@type": "odpt:BusTimetable";
    "dc:date"?: string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:operator"?: string;
    "odpt:busroutePattern"?: string;
    "odpt:calendar"?: string;
    "odpt:busTimetableObject"?: {
        "odpt:departureTime"?: string;
        "odpt:arrivalTime"?: string;
        "odpt:departureBusstopPole"?: string;
        "odpt:arrivalBusstopPole"?: string;
        "odpt:destinationSign"?: string;
    }[];
}

export interface OdptBusstopPole {
    "@id": string;
    "@type": "odpt:BusstopPole";
    "dc:date"?: string;
    "dc:title"?: string;
    "owl:sameAs": string;
    "odpt:operator"?: string;
    "odpt:busroutePattern"?: string[];
    "odpt:busstopPoleNumber"?: string;
    "geo:lat"?: number;
    "geo:long"?: number;
}

export interface OdptBusstopPoleTimetable {
    "@id": string;
    "@type": "odpt:BusstopPoleTimetable";
    "dc:date"?: string;
    "owl:sameAs": string;
    "odpt:operator"?: string;
    "odpt:calendar"?: string;
    "odpt:busstopPole"?: string;
    "odpt:busroute"?: string;
    "odpt:busDirection"?: string;
    "odpt:busstopPoleTimetableObject"?: {
        "odpt:departureTime": string;
        "odpt:destinationSign"?: string;
        "odpt:note"?: string;
    }[];
}
