use anyhow::Result;
use serde::de::DeserializeOwned;
use serde::Serialize;
use sqlx::{PgPool, postgres::PgPoolOptions, Row};
use std::env;

#[derive(Clone)]
pub struct SupabaseClient {
    pool: PgPool,
}

impl SupabaseClient {
    pub fn from_env() -> Result<Self> {
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");

        // Use session pooler (port 5432) instead of transaction pooler (6543)
        // Transaction pooler doesn't support prepared statements
        let connection_url = database_url
            .replace(":6543/", ":5432/");

        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect_lazy(&connection_url)?;

        Ok(Self { pool })
    }

    pub async fn fetch_active_stations<T>(&self) -> Result<Vec<T>> 
    where T: for<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin
    {
         let stations = sqlx::query_as::<_, T>("SELECT id, ST_AsGeoJSON(coordinates)::jsonb as coordinates, name FROM nodes WHERE is_active = true")
            .fetch_all(&self.pool)
            .await?;
        Ok(stations)
    }

    pub async fn get_existing_osm_ids(&self, station_id: &str, facility_type: &str) -> Result<Vec<i64>> {
        let rows = sqlx::query(
            r#"
            SELECT attributes->>'osm_id' as osm_id
            FROM l3_facilities
            WHERE station_id = $1 AND type = $2
            "#
        )
        .bind(station_id)
        .bind(facility_type)
        .fetch_all(&self.pool)
        .await?;

        let ids: Vec<i64> = rows
            .into_iter()
            .filter_map(|row| {
                // Safely extract text and parse
                use sqlx::Row;
                row.try_get::<String, _>("osm_id")
                    .ok()
                    .and_then(|s| s.parse::<i64>().ok())
            })
            .collect();

        Ok(ids)
    }

    pub async fn insert_facilities<T: Serialize>(&self, facilities: &[T]) -> Result<()> {
        let json_array = serde_json::to_value(facilities)?;

        sqlx::query(
            r#"
            INSERT INTO l3_facilities (station_id, type, name_i18n, location_coords, attributes, source_url, updated_at)
            SELECT
                (item->>'station_id')::text,
                (item->>'type')::text,
                (item->'name_i18n')::jsonb,
                ST_GeomFromText(item->>'location_coords'),
                (item->'attributes')::jsonb,
                (item->>'source_url')::text,
                (item->>'updated_at')::timestamp
            FROM jsonb_array_elements($1::jsonb) as item
            "#
        )
        .bind(json_array)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
