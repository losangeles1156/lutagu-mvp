use odpt_client::OdptClient;
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path, query_param};

#[tokio::test]
async fn test_get_stations_success() {
    let mock_server = MockServer::start().await;
    let mock_url = mock_server.uri();

    let expected_body = r#"[
        {
            "@id": "urn:ucode:_00001C000000000000010000030C4D93",
            "@type": "odpt:Station",
            "dc:date": "2021-06-21T14:48:19+09:00",
            "dc:title": "Ueno",
            "odpt:stationTitle": {"en": "Ueno", "ja": "上野"},
            "odpt:operator": "odpt.Operator:TokyoMetro",
            "odpt:railway": "odpt.Railway:TokyoMetro.Ginza",
            "geo:lat": 35.713768,
            "geo:long": 139.777254
        }
    ]"#;

    Mock::given(method("GET"))
        .and(path("/odpt:Station"))
        .and(query_param("odpt:operator", "odpt.Operator:TokyoMetro"))
        .and(query_param("acl:consumerKey", "dummy_key"))
        .respond_with(ResponseTemplate::new(200).set_body_string(expected_body))
        .mount(&mock_server)
        .await;

    let client = OdptClient::new("dummy_key".to_string(), false)
        .unwrap()
        .with_base_url(mock_url);

    let stations = client.get_stations(Some("odpt.Operator:TokyoMetro"), None).await.unwrap();

    assert_eq!(stations.len(), 1);
    assert_eq!(stations[0].title, "Ueno");
    assert_eq!(stations[0].operator, "odpt.Operator:TokyoMetro");
}
