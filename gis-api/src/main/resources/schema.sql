CREATE EXTENSION IF NOT EXISTS postgis;

-- 서울시 자치구 경계 (WGS84 경위도, EPSG:4326)
CREATE TABLE IF NOT EXISTS district (
    code     VARCHAR(5) PRIMARY KEY,
    name     VARCHAR(20) NOT NULL,
    name_eng VARCHAR(40) NOT NULL,
    geom     geometry(MultiPolygon, 4326) NOT NULL
);

-- 공간 인덱스: 점 포함 검색, 이웃 검색 등을 빠르게
CREATE INDEX IF NOT EXISTS district_geom_idx ON district USING GIST (geom);

-- OpenStreetMap 시설 (지하철역/학교/병원은 점, 공원은 폴리곤)
CREATE TABLE IF NOT EXISTS poi (
    id       BIGSERIAL PRIMARY KEY,
    osm_id   VARCHAR(40) NOT NULL,
    category VARCHAR(20) NOT NULL,
    name     VARCHAR(200),
    geom     geometry(Geometry, 4326) NOT NULL,
    UNIQUE (category, osm_id)
);

CREATE INDEX IF NOT EXISTS poi_geom_idx ON poi USING GIST (geom);
CREATE INDEX IF NOT EXISTS poi_category_idx ON poi (category);

-- 구별 시설 집계 (공간 조인). 계산이 무거워서 미리 만들어 두고, 데이터 적재 후 REFRESH 한다.
CREATE MATERIALIZED VIEW IF NOT EXISTS district_stats AS
SELECT d.code,
       ST_Area(d.geom::geography) / 1e6 AS area_km2,
       -- 같은 역이 노선별로 따로 등록되어 있어 이름 기준으로 중복 제거
       (SELECT count(DISTINCT coalesce(p.name, p.osm_id)) FROM poi p
         WHERE p.category = 'subway' AND ST_Contains(d.geom, p.geom))   AS subway_count,
       (SELECT count(*) FROM poi p
         WHERE p.category = 'school' AND ST_Contains(d.geom, p.geom))   AS school_count,
       (SELECT count(*) FROM poi p
         WHERE p.category = 'hospital' AND ST_Contains(d.geom, p.geom)) AS hospital_count,
       -- 공원은 내부의 대표점이 구 안에 있으면 그 구의 공원으로 센다
       (SELECT count(*) FROM poi p
         WHERE p.category = 'park' AND ST_Contains(d.geom, ST_PointOnSurface(p.geom))) AS park_count,
       -- 녹지 면적: 겹치는 공원을 합친(Union) 뒤 구 경계로 잘라(Intersection) 면적 계산
       coalesce((SELECT ST_Area(ST_Intersection(d.geom, ST_Union(p.geom))::geography) / 1e6
                   FROM poi p
                  WHERE p.category = 'park' AND ST_Intersects(d.geom, p.geom)), 0) AS park_area_km2
FROM district d
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS district_stats_code_idx ON district_stats (code);
