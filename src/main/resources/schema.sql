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
