# gis-api

서울시 자치구 경계를 PostGIS에 저장하고 GeoJSON / 공간 분석 결과를 제공하는 Spring Boot 백엔드.
프론트엔드: [next-dashboard](../next-dashboard)

## 스택
- Java 17, Spring Boot 4 (Web MVC, JDBC)
- PostgreSQL 16 + PostGIS 3

## 실행
1. PostgreSQL에 DB 생성
   ```sql
   CREATE DATABASE gisdb ENCODING 'UTF8';
   ```
   (`postgis` 확장과 `district` 테이블은 앱 시작 시 `schema.sql`이 만든다)
2. 프로젝트 루트에 `local.properties` 작성 (Git에 올라가지 않음)
   ```properties
   DB_PASSWORD=비밀번호
   ```
3. 실행: `./gradlew bootRun` → http://localhost:8080

처음 실행하면 `src/main/resources/data/`의 구 경계와 OSM 시설 GeoJSON을 `district`, `poi` 테이블에 적재하고 구별 집계를 만든다.

## API
| 메서드 | 경로 | 설명 | 사용한 PostGIS 함수 |
|---|---|---|---|
| GET | `/api/districts` | 25개 구 경계 + 면적·시설 집계 (GeoJSON) | `ST_AsGeoJSON`, `ST_Area` |
| GET | `/api/districts/summary` | 구 개수, 총면적, 최대/최소 구, 시설 합계 | `ST_Area` |
| GET | `/api/districts/{code}` | 면적, 둘레, 중심점, 시설 집계, 지하철역 목록, 이웃 구 | `ST_Perimeter`, `ST_PointOnSurface`, `ST_DWithin` |
| GET | `/api/districts/locate?lng=&lat=` | 좌표가 속한 구 | `ST_Contains` |
| GET | `/api/pois?category=` | 시설 위치 GeoJSON (`subway`, `school`, `hospital`, `park`) | `ST_Intersects`, `ST_SimplifyPreserveTopology` |
| GET | `/api/subway/lines` | 1~9호선 노선 (호선 색 포함, 서울 주변으로 자름) | `ST_LineMerge`, `ST_Intersection` |
| GET | `/api/subway/stations` | 지하철역 + 지나는 호선, 환승역 여부 | `ST_Collect`, `ST_Centroid`, `ST_DWithin` |

면적/거리는 `geometry::geography`로 변환해 실제 미터 단위로 계산한다.

### 구별 시설 집계 (`district_stats`)
시설이 어느 구에 속하는지 공간 조인으로 계산해 materialized view에 저장하고, 데이터 적재 후 `REFRESH` 한다.
- 지하철역/학교/병원: `ST_Contains(구, 시설 점)` (지하철역은 노선별 중복을 이름으로 제거)
- 공원 수: 공원 내부 대표점(`ST_PointOnSurface`)이 속한 구
- 공원 면적: 겹치는 공원을 `ST_Union`으로 합친 뒤 구 경계로 `ST_Intersection`, 면적 계산

### 지하철역-호선 연결 (`subway_station`)
OSM에는 역이 노선마다 따로 찍혀 있어 이름으로 묶어 대표점을 만들고, 역 점에서 150m 안을 지나는 노선을 그 역의 호선으로 본다.
120m면 잠실(8호선)이 빠지고 180m부터는 광화문-1호선처럼 서지 않는 노선이 잡혀 150m로 정했다. (1~9호선만 포함, 신분당선·공항철도 등은 제외)

## 데이터 출처
- 시설(지하철역·노선, 학교, 병원, 공원): © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL. 2026-11 Overpass API로 수집.
  다시 받으려면 `scripts/osm`에서 `npm install && sh fetch.sh` (Git Bash). 공원은 `leisure=park` 기준이라 산림·국립공원은 제외된다.
- 서울시 자치구 경계: [southkorea/seoul-maps](https://github.com/southkorea/seoul-maps) (`juso/2015/json/seoul_municipalities_geo_simple.json`, 행정안전부 도로명주소 데이터 기반, 단순화된 경계)
