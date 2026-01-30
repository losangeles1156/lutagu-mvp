use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OdptStation {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub type_: String,
    #[serde(rename = "dc:date")]
    pub date: Option<String>,
    #[serde(rename = "dc:title")]
    pub title: String,
    #[serde(rename = "odpt:stationTitle")]
    pub station_title: serde_json::Value, // Can be object or string sometimes, keep flexible or struct
    #[serde(rename = "odpt:operator")]
    pub operator: String,
    #[serde(rename = "odpt:railway")]
    pub railway: String,
    #[serde(rename = "odpt:sameAs")]
    pub same_as: Option<String>,
    #[serde(rename = "odpt:connectingRailway")]
    pub connecting_railway: Option<Vec<String>>,
    #[serde(rename = "geo:lat")]
    pub lat: Option<f64>,
    #[serde(rename = "geo:long")]
    pub long: Option<f64>,
    #[serde(rename = "odpt:passengerSurvey")]
    pub passenger_survey: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OdptTrain {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub type_: String,
    #[serde(rename = "odpt:trainNumber")]
    pub train_number: String,
    #[serde(rename = "odpt:railway")]
    pub railway: String,
    #[serde(rename = "odpt:delay")]
    pub delay: Option<i32>,
    #[serde(rename = "odpt:startingStation")]
    pub starting_station: Option<String>,
    #[serde(rename = "odpt:terminalStation")]
    pub terminal_station: Option<String>,
    #[serde(rename = "odpt:fromStation")]
    pub from_station: Option<String>,
    #[serde(rename = "odpt:toStation")]
    pub to_station: Option<String>,
    #[serde(rename = "odpt:railDirection")]
    pub rail_direction: Option<String>,
    #[serde(rename = "odpt:trainType")]
    pub train_type: Option<String>,
    #[serde(rename = "odpt:trainOwner")]
    pub train_owner: Option<String>,
    #[serde(rename = "odpt:carComposition")]
    pub car_composition: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OdptTrainInformation {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub type_: String,
    #[serde(rename = "odpt:railway")]
    pub railway: String,
    #[serde(rename = "odpt:operator")]
    pub operator: String,
    #[serde(rename = "odpt:trainInformationStatus")]
    pub status: Option<serde_json::Value>, // Using Value as generic fallback
    #[serde(rename = "odpt:trainInformationText")]
    pub text: Option<serde_json::Value>,
    #[serde(rename = "odpt:timeOfOrigin")]
    pub time_of_origin: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OdptStationTimetable {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "odpt:station")]
    pub station: String,
    #[serde(rename = "odpt:railway")]
    pub railway: String,
    #[serde(rename = "odpt:operator")]
    pub operator: String,
    #[serde(rename = "odpt:calendar")]
    pub calendar: Option<String>,
    #[serde(rename = "odpt:stationTimetableObject")]
    pub timetable_objects: Vec<OdptStationTimetableObject>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OdptStationTimetableObject {
    #[serde(rename = "odpt:departureTime")]
    pub departure_time: String,
    #[serde(rename = "odpt:destinationStation")]
    pub destination_station: Option<Vec<String>>,
    #[serde(rename = "odpt:trainType")]
    pub train_type: Option<String>,
    #[serde(rename = "odpt:isLast")]
    pub is_last: Option<bool>,
}
