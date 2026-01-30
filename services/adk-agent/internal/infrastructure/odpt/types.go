package odpt

import (
    "encoding/json"
    "time"
)

type TrainInformation struct {
    ID                    string                 `json:"@id"`
    Type                  string                 `json:"@type"`
    Date                  time.Time              `json:"dc:date"`
    Valid                 time.Time              `json:"dct:valid"`
    Operator              string                 `json:"odpt:operator"`
    Railway               string                 `json:"odpt:railway"`
    TimeOfOrigin          time.Time              `json:"odpt:timeOfOrigin"`
    TrainInformationText  LocalizedText          `json:"odpt:trainInformationText"`
    TrainInformationStatus *LocalizedText        `json:"odpt:trainInformationStatus,omitempty"`
}

type LocalizedText struct {
    Ja string `json:"ja"`
    En string `json:"en"`
}

// Custom UnmarshalJSON needed because ODPT API sometimes returns a string, sometimes an object
func (l *LocalizedText) UnmarshalJSON(data []byte) error {
    // Try string first
    var s string
    if err := json.Unmarshal(data, &s); err == nil {
        l.Ja = s
        l.En = s // Fallback
        return nil
    }

    // Try object
    type Alias LocalizedText
    var obj Alias
    if err := json.Unmarshal(data, &obj); err != nil {
        return err
    }
    *l = LocalizedText(obj)
    return nil
}

type SimplifiedStatus struct {
    Railway string `json:"railway"`
    Status  string `json:"status"` // normal, delay, suspended, unknown
    Text    string `json:"text"`
    Time    string `json:"time"`
}
