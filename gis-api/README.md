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

처음 실행하면 `src/main/resources/data/seoul-districts.geojson`을 `district` 테이블에 적재한다.

## API
| 메서드 | 경로 | 설명 | 사용한 PostGIS 함수 |
|---|---|---|---|
| GET | `/api/districts` | 25개 구 경계 (GeoJSON FeatureCollection) | `ST_AsGeoJSON`, `ST_Area` |
| GET | `/api/districts/summary` | 구 개수, 총면적, 최대/최소 구 | `ST_Area` |
| GET | `/api/districts/{code}` | 면적, 둘레, 중심점, 이웃 구 | `ST_Perimeter`, `ST_PointOnSurface`, `ST_DWithin` |
| GET | `/api/districts/locate?lng=&lat=` | 좌표가 속한 구 | `ST_Contains` |

면적/거리는 `geometry::geography`로 변환해 실제 미터 단위로 계산한다.

## 데이터 출처
서울시 자치구 경계: [southkorea/seoul-maps](https://github.com/southkorea/seoul-maps) (`juso/2015/json/seoul_municipalities_geo_simple.json`, 행정안전부 도로명주소 데이터 기반, 단순화된 경계)
