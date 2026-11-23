package com.example.gisapi.district;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** PostGIS 공간 쿼리 모음. 면적/둘레는 geography로 변환해 실제 거리(m) 기준으로 계산한다. */
@Repository
public class DistrictRepository {

    private final JdbcTemplate jdbc;

    public DistrictRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 전체 구를 GeoJSON FeatureCollection 문자열로 반환 (PostGIS에서 JSON까지 생성). */
    public String findAllAsGeoJson() {
        return jdbc.queryForObject("""
                SELECT json_build_object(
                         'type', 'FeatureCollection',
                         'features', COALESCE(json_agg(json_build_object(
                             'type', 'Feature',
                             'id', code::int,
                             'geometry', ST_AsGeoJSON(geom, 6)::json,
                             'properties', json_build_object(
                                 'code', code,
                                 'name', name,
                                 'nameEng', name_eng,
                                 'areaKm2', round((ST_Area(geom::geography) / 1e6)::numeric, 2)
                             )
                         ) ORDER BY code), '[]'::json)
                       )::text
                FROM district
                """, String.class);
    }

    public Optional<DistrictDetail> findDetail(String code) {
        List<DistrictDetail> rows = jdbc.query("""
                SELECT code, name, name_eng,
                       round((ST_Area(geom::geography) / 1e6)::numeric, 2)      AS area_km2,
                       round((ST_Perimeter(geom::geography) / 1e3)::numeric, 2) AS perimeter_km,
                       ST_X(ST_PointOnSurface(geom)) AS lng,
                       ST_Y(ST_PointOnSurface(geom)) AS lat
                FROM district
                WHERE code = ?
                """,
                (rs, i) -> new DistrictDetail(
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("name_eng"),
                        rs.getDouble("area_km2"),
                        rs.getDouble("perimeter_km"),
                        new double[] { rs.getDouble("lng"), rs.getDouble("lat") },
                        findNeighbors(code)),
                code);
        return rows.stream().findFirst();
    }

    /** 경계가 맞닿은 구 (단순화된 경계라 오차를 감안해 100m 이내면 이웃으로 본다). */
    private List<DistrictDetail.Neighbor> findNeighbors(String code) {
        return jdbc.query("""
                SELECT b.code, b.name
                FROM district a
                JOIN district b ON a.code <> b.code
                 AND ST_DWithin(a.geom::geography, b.geom::geography, 100)
                WHERE a.code = ?
                ORDER BY b.name
                """,
                (rs, i) -> new DistrictDetail.Neighbor(rs.getString("code"), rs.getString("name")),
                code);
    }

    /** 경위도 좌표가 속한 구 */
    public Optional<DistrictDetail.Neighbor> findContaining(double lng, double lat) {
        return jdbc.query("""
                SELECT code, name FROM district
                WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326))
                """,
                (rs, i) -> new DistrictDetail.Neighbor(rs.getString("code"), rs.getString("name")),
                lng, lat).stream().findFirst();
    }

    public DistrictSummary summary() {
        return jdbc.queryForObject("""
                WITH a AS (
                    SELECT code, name, ST_Area(geom::geography) / 1e6 AS km2 FROM district
                )
                SELECT (SELECT count(*) FROM a)                                   AS cnt,
                       (SELECT round(sum(km2)::numeric, 2) FROM a)                AS total,
                       (SELECT name FROM a ORDER BY km2 DESC LIMIT 1)             AS largest_name,
                       (SELECT round(max(km2)::numeric, 2) FROM a)                AS largest_km2,
                       (SELECT name FROM a ORDER BY km2 ASC LIMIT 1)              AS smallest_name,
                       (SELECT round(min(km2)::numeric, 2) FROM a)                AS smallest_km2
                """,
                (rs, i) -> new DistrictSummary(
                        rs.getInt("cnt"),
                        rs.getDouble("total"),
                        new DistrictSummary.NamedArea(rs.getString("largest_name"), rs.getDouble("largest_km2")),
                        new DistrictSummary.NamedArea(rs.getString("smallest_name"), rs.getDouble("smallest_km2"))));
    }
}
