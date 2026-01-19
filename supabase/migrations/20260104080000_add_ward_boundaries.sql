-- Migration: Add Tokyo 23 Wards boundary polygons
-- This provides spatial boundaries for ward detection via ST_Contains

-- Update wards with simplified boundary polygons (WGS84)
-- These are simplified polygons approximating each ward's boundaries

DO $$
DECLARE
  ward_id TEXT;
  boundary_json JSONB;
BEGIN
  -- ward:chiyoda (千代田區) - Central Tokyo including Imperial Palace
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.76, 35.68], [139.77, 35.68], [139.77, 35.69], [139.76, 35.69], [139.76, 35.68]]]
  }'), 4326) WHERE id = 'ward:chiyoda';

  -- ward:chuo (中央區) - Ginza, Tsukiji, Nihombashi
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.76, 35.66], [139.78, 35.66], [139.78, 35.68], [139.76, 35.68], [139.76, 35.66]]]
  }'), 4326) WHERE id = 'ward:chuo';

  -- ward:minato (港區) - Roppongi, Shiodome, Akasaka
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.74, 35.65], [139.77, 35.65], [139.77, 35.68], [139.74, 35.68], [139.74, 35.65]]]
  }'), 4326) WHERE id = 'ward:minato';

  -- ward:shinjuku (新宿區) - Shinjuku, Takadanobaba
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.68, 35.68], [139.71, 35.68], [139.71, 35.70], [139.68, 35.70], [139.68, 35.68]]]
  }'), 4326) WHERE id = 'ward:shinjuku';

  -- ward:bunkyo (文京區) - University area, Koishikawa
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.72, 35.71], [139.75, 35.71], [139.75, 35.73], [139.72, 35.73], [139.72, 35.71]]]
  }'), 4326) WHERE id = 'ward:bunkyo';

  -- ward:taito (台東區) - Ueno, Asakusa
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.76, 35.70], [139.80, 35.70], [139.80, 35.73], [139.76, 35.73], [139.76, 35.70]]]
  }'), 4326) WHERE id = 'ward:taito';

  -- ward:sumida (墨田區) - Sumida, Oshiage
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.78, 35.70], [139.82, 35.70], [139.82, 35.74], [139.78, 35.74], [139.78, 35.70]]]
  }'), 4326) WHERE id = 'ward:sumida';

  -- ward:koto (江東區) - Toyosu, Harumi
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.78, 35.66], [139.82, 35.66], [139.82, 35.70], [139.78, 35.70], [139.78, 35.66]]]
  }'), 4326) WHERE id = 'ward:koto';

  -- ward:shinagawa (品川區) - Shinagawa, Takanawa
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.72, 35.63], [139.76, 35.63], [139.76, 35.66], [139.72, 35.66], [139.72, 35.63]]]
  }'), 4326) WHERE id = 'ward:shinagawa';

  -- ward:meguro (目黑區) - Meguro, Nakameguro
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.68, 35.64], [139.72, 35.64], [139.72, 35.66], [139.68, 35.66], [139.68, 35.64]]]
  }'), 4326) WHERE id = 'ward:meguro';

  -- ward:ota (大田区) - Haneda, Kamata
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.72, 35.55], [139.78, 35.55], [139.78, 35.64], [139.72, 35.64], [139.72, 35.55]]]
  }'), 4326) WHERE id = 'ward:ota';

  -- ward:setagaya (世田谷區) - Setagaya, Sangenjaya
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.65, 35.63], [139.70, 35.63], [139.70, 35.66], [139.65, 35.66], [139.65, 35.63]]]
  }'), 4326) WHERE id = 'ward:setagaya';

  -- ward:shibuya (渋谷區) - Shibuya, Harajuku
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.68, 35.65], [139.72, 35.65], [139.72, 35.68], [139.68, 35.68], [139.68, 35.65]]]
  }'), 4326) WHERE id = 'ward:shibuya';

  -- ward:nakano (中野區) - Nakano
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.65, 35.68], [139.68, 35.68], [139.68, 35.71], [139.65, 35.71], [139.65, 35.68]]]
  }'), 4326) WHERE id = 'ward:nakano';

  -- ward:suginami (杉並區) - Suginami, Ogikubo
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.62, 35.68], [139.67, 35.68], [139.67, 35.72], [139.62, 35.72], [139.62, 35.68]]]
  }'), 4326) WHERE id = 'ward:suginami';

  -- ward:toshima (豐島區) - Ikebukuro, Komagome
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.70, 35.71], [139.73, 35.71], [139.73, 35.74], [139.70, 35.74], [139.70, 35.71]]]
  }'), 4326) WHERE id = 'ward:toshima';

  -- ward:kita (北區) - Kita, Akabane
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.72, 35.72], [139.76, 35.72], [139.76, 35.76], [139.72, 35.76], [139.72, 35.72]]]
  }'), 4326) WHERE id = 'ward:kita';

  -- ward:arakawa (荒川區) - Arakawa, Machida
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.76, 35.72], [139.79, 35.72], [139.79, 35.75], [139.76, 35.75], [139.76, 35.72]]]
  }'), 4326) WHERE id = 'ward:arakawa';

  -- ward:itabashi (板橋區) - Itabashi
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.69, 35.74], [139.73, 35.74], [139.73, 35.77], [139.69, 35.77], [139.69, 35.74]]]
  }'), 4326) WHERE id = 'ward:itabashi';

  -- ward:nerima (練馬區) - Nerima, Toshimaen
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.62, 35.72], [139.68, 35.72], [139.68, 35.76], [139.62, 35.76], [139.62, 35.72]]]
  }'), 4326) WHERE id = 'ward:nerima';

  -- ward:adachi (足立區) - Adachi, Kitasenju
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.77, 35.74], [139.82, 35.74], [139.82, 35.80], [139.77, 35.80], [139.77, 35.74]]]
  }'), 4326) WHERE id = 'ward:adachi';

  -- ward:edogawa (江戸川區) - Edogawa, Kasai
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.82, 35.70], [139.87, 35.70], [139.87, 35.76], [139.82, 35.76], [139.82, 35.70]]]
  }'), 4326) WHERE id = 'ward:edogawa';

  -- ward:katsushika (葛飾區) - Katsushika, Kameari
  UPDATE public.wards SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[139.82, 35.74], [139.87, 35.74], [139.87, 35.80], [139.82, 35.80], [139.82, 35.74]]]
  }'), 4326) WHERE id = 'ward:katsushika';
END $$;

-- Update center_point for wards that don't have one (using centroid of boundary)
UPDATE public.wards w
SET center_point = ST_Centroid(boundary)
WHERE w.center_point IS NULL AND w.boundary IS NOT NULL;

-- Register migration
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260104080000', 'add_ward_boundaries.sql', ARRAY[1]::text[])
ON CONFLICT (version) DO NOTHING;

-- Verify
SELECT id, name_i18n->>'ja' as name,
       boundary IS NOT null as has_boundary,
       node_count
FROM public.wards ORDER BY id;
