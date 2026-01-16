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
    "odpt:trainInformationText": {
        en?: string;
        ja?: string;
    };
    "odpt:railway": string;
    "odpt:operator": string;
    "odpt:timeOfOrigin"?: string;
    "odpt:trainInformationStatus"?: string;
}
