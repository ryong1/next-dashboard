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

-- OpenStreetMap 시설 (전철역/학교/병원은 점, 공원은 폴리곤)
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
-- ※ 정의를 바꾸면 DROP MATERIALIZED VIEW district_stats; 후 앱을 다시 시작해야 반영된다
CREATE MATERIALIZED VIEW IF NOT EXISTS district_stats AS
SELECT d.code,
       ST_Area(d.geom::geography) / 1e6 AS area_km2,
       -- 같은 역이 노선별로 따로 등록되어 있어 정규화한 이름 기준으로 중복 제거 (서울역/서울)
       (SELECT count(DISTINCT trim(regexp_replace(regexp_replace(coalesce(p.name, p.osm_id),
                  '\s*\(.*?\)\s*', '', 'g'), '역$', '')))
          FROM poi p
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

-- 전철 노선 (1~9호선 + 수도권 전철 노선, 서울 주변으로 잘라서 저장)
-- ref: 1~9 또는 영문 코드(GJ=경의중앙, SB=신분당 ...), short_name: 배지에 쓰는 짧은 이름, sort: 표시 순서
CREATE TABLE IF NOT EXISTS subway_line (
    ref        VARCHAR(4) PRIMARY KEY,
    name       VARCHAR(30) NOT NULL,
    short_name VARCHAR(20) NOT NULL,
    colour     VARCHAR(9) NOT NULL,
    sort       INT NOT NULL,
    geom       geometry(MultiLineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS subway_line_geom_idx ON subway_line USING GIST (geom);

-- 노선별 정차역 이름 (OSM 노선 관계의 stop 멤버, 이름은 괄호와 끝의 "역"을 뗀 형태)
CREATE TABLE IF NOT EXISTS subway_line_stop (
    ref  VARCHAR(4)  NOT NULL,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (ref, name)
);

-- 전철역: 역 점을 정규화한 이름(괄호, 끝의 "역" 제거)으로 묶어 대표점 하나로 만들고, 호선은 두 근거를 합친다.
--  1) 노선 관계의 정차역 목록에 이름이 있음 (예: "총신대입구(이수)"는 "총신대입구"와 "이수" 둘 다 확인)
--  2) 1~9호선만: 역 점에서 150m 안을 노선이 지나감
--     (120m면 잠실 8호선이 빠지고, 180m부터는 광화문-1호선처럼 안 서는 노선이 잡혀서 150m로 정함.
--      일반철도 노선은 서지 않고 지나가는 경우가 많아 정차역 목록으로만 판단)
-- ※ 이 정의를 바꾸면 DROP MATERIALIZED VIEW subway_station; 후 앱을 다시 시작해야 반영된다
CREATE MATERIALIZED VIEW IF NOT EXISTS subway_station AS
WITH p AS (
    SELECT name, geom,
           trim(regexp_replace(regexp_replace(name, '\s*\(.*?\)\s*', '', 'g'), '역$', '')) AS base_name,
           substring(name FROM '\((.*?)\)') AS alias_name
    FROM poi
    WHERE category = 'subway' AND name IS NOT NULL
), st AS (
    -- 표시 이름: 괄호 별칭이 있는 이름 우선, 없으면 가장 짧은 이름 ("서울역"/"서울" → "서울")
    SELECT base_name,
           (array_agg(name ORDER BY (name ~ '\(') DESC, length(name), name))[1] AS name,
           max(alias_name) AS alias_name,
           ST_Centroid(ST_Collect(geom)) AS geom
    FROM p
    GROUP BY base_name
)
SELECT st.name,
       st.geom,
       coalesce((SELECT array_agg(y.ref ORDER BY y.sort) FROM (
                   SELECT DISTINCT x.ref, l2.sort FROM (
                       SELECT ls.ref FROM subway_line_stop ls
                        WHERE ls.name IN (st.base_name, st.alias_name)
                       UNION
                       SELECT l.ref
                         FROM p p2
                         JOIN subway_line l
                           ON l.ref ~ '^[1-9]$'
                          AND l.geom && ST_Expand(p2.geom, 0.002)  -- 공간 인덱스로 후보를 먼저 거름
                          AND ST_DWithin(l.geom::geography, p2.geom::geography, 150)
                        WHERE p2.base_name = st.base_name
                   ) x
                   JOIN subway_line l2 ON l2.ref = x.ref
                 ) y), '{}') AS lines
FROM st
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS subway_station_name_idx ON subway_station (name);
