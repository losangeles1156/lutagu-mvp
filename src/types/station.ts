export interface Station {
    id: string;
    name: { ja?: string; en?: string; 'zh-TW'?: string };
    operator: string;
    railway?: string;
}

// Rust/ODPT Aligned Types
export interface OdptStation {
    id: string; // @id
    type: string; // @type
    date?: string; // dc:date
    title: string; // dc:title
    stationTitle: string | { ja: string; en?: string }; // odpt:stationTitle
    operator: string; // odpt:operator
    railway: string; // odpt:railway
    sameAs?: string; // odpt:sameAs
    connectingRailway?: string[]; // odpt:connectingRailway
    lat?: number; // geo:lat
    long?: number; // geo:long
    passengerSurvey?: string[]; // odpt:passengerSurvey
}

export interface OdptStationTimetableObject {
    departureTime: string; // odpt:departureTime
    destinationStation?: string[]; // odpt:destinationStation
    trainType?: string; // odpt:trainType
    isLast?: boolean; // odpt:isLast
}

export interface OdptStationTimetable {
    id: string; // @id
    station: string; // odpt:station
    railway: string; // odpt:railway
    operator: string; // odpt:operator
    calendar?: string; // odpt:calendar
    timetableObjects: OdptStationTimetableObject[]; // odpt:stationTimetableObject
}
