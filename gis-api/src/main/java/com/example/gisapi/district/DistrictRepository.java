package com.example.gisapi.district;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.example.gisapi.common.DistrictRef;
import com.example.gisapi.common.GeoJson;
import com.example.gisapi.common.SqlUtils;

/**
 * PostGIS 공간 쿼리 모음. 면적/둘레는 geography로 변환해 실제 거리(m) 기준으로 계산한다.
 * 시설 집계는 district_stats(materialized view)에서 읽는다.
 */
@Repository
public class DistrictRepository {

    /** district_stats(s) 컬럼을 DistrictStats 형태로 뽑는 SELECT 조각 */
    private static final String STATS_COLUMNS = """
            s.subway_count, s.school_count, s.hospital_count, s.park_count,
            round(s.park_area_km2::numeric, 2)                            AS park_area_km2,
            round((s.park_area_km2 / s.area_km2 * 100)::numeric, 1)       AS park_ratio
            """;

    private final JdbcTemplate jdbc;

    public DistrictRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static DistrictStats mapStats(ResultSet rs) throws SQLException {
        return new DistrictStats(
                rs.getInt("subway_count"),
                rs.getInt("school_count"),
                rs.getInt("hospital_count"),
                rs.getInt("park_count"),
                rs.getDouble("park_area_km2"),
                rs.getDouble("park_ratio"));
    }

    /** 전체 구를 GeoJSON FeatureCollection 문자열로 반환 (PostGIS에서 JSON까지 생성). */
    public String findAllAsGeoJson() {
        String feature = GeoJson.feature("d.code::int", "d.geom", """
                json_build_object(
                    'code', d.code,
                    'name', d.name,
                    'nameEng', d.name_eng,
                    'areaKm2', round(s.area_km2::numeric, 2),
                    'subway', s.subway_count,
                    'school', s.school_count,
                    'hospital', s.hospital_count,
                    'park', s.park_count,
                    'parkAreaKm2', round(s.park_area_km2::numeric, 2),
                    'parkRatio', round((s.park_area_km2 / s.area_km2 * 100)::numeric, 1)
                )""");
        return jdbc.queryForObject(GeoJson.featureCollectionSql(feature, "d.code", """
                FROM district d
                JOIN district_stats s ON s.code = d.code
                """), String.class);
    }

    public Optional<DistrictDetail> findDetail(String code) {
        List<DistrictDetail> rows = jdbc.query("""
                SELECT d.code, d.name, d.name_eng,
                       round(s.area_km2::numeric, 2)                              AS area_km2,
                       round((ST_Perimeter(d.geom::geography) / 1e3)::numeric, 2) AS perimeter_km,
                       ST_X(ST_PointOnSurface(d.geom)) AS lng,
                       ST_Y(ST_PointOnSurface(d.geom)) AS lat,
                """ + STATS_COLUMNS + """
                FROM district d
                JOIN district_stats s ON s.code = d.code
                WHERE d.code = ?
                """,
                (rs, i) -> new DistrictDetail(
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("name_eng"),
                        rs.getDouble("area_km2"),
                        rs.getDouble("perimeter_km"),
                        new double[] { rs.getDouble("lng"), rs.getDouble("lat") },
                        mapStats(rs),
                        findSubwayStations(code),
                        findNeighbors(code)),
                code);
        return rows.stream().findFirst();
    }

    /** 구 안의 지하철역과 지나는 호선 */
    private List<SubwayStation> findSubwayStations(String code) {
        return jdbc.query("""
                SELECT st.name, st.lines
                FROM subway_station st
                JOIN district d ON ST_Contains(d.geom, st.geom)
                WHERE d.code = ?
                ORDER BY st.name
                """,
                (rs, i) -> new SubwayStation(rs.getString("name"), SqlUtils.textList(rs, "lines")),
                code);
    }

    /** 경계가 맞닿은 구 (단순화된 경계라 오차를 감안해 100m 이내면 이웃으로 본다). */
    private List<DistrictRef> findNeighbors(String code) {
        return jdbc.query("""
                SELECT b.code, b.name
                FROM district a
                JOIN district b ON a.code <> b.code
                 AND ST_DWithin(a.geom::geography, b.geom::geography, 100)
                WHERE a.code = ?
                ORDER BY b.name
                """,
                (rs, i) -> new DistrictRef(rs.getString("code"), rs.getString("name")),
                code);
    }

    /** 경위도 좌표가 속한 구 (구 위치 찾기 API와 반경 분석이 함께 사용) */
    public Optional<DistrictRef> findContaining(double lng, double lat) {
        return jdbc.query("""
                SELECT code, name FROM district
                WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326))
                """,
                (rs, i) -> new DistrictRef(rs.getString("code"), rs.getString("name")),
                lng, lat).stream().findFirst();
    }

    public DistrictSummary summary() {
        return jdbc.queryForObject("""
                WITH s AS (SELECT * FROM district_stats)
                SELECT (SELECT count(*) FROM s)                                     AS cnt,
                       (SELECT round(sum(area_km2)::numeric, 2) FROM s)             AS total,
                       (SELECT d.name FROM s JOIN district d USING (code)
                         ORDER BY s.area_km2 DESC LIMIT 1)                          AS largest_name,
                       (SELECT round(max(area_km2)::numeric, 2) FROM s)             AS largest_km2,
                       (SELECT d.name FROM s JOIN district d USING (code)
                         ORDER BY s.area_km2 ASC LIMIT 1)                           AS smallest_name,
                       (SELECT round(min(area_km2)::numeric, 2) FROM s)             AS smallest_km2,
                       (SELECT sum(subway_count) FROM s)                            AS subway_count,
                       (SELECT sum(school_count) FROM s)                            AS school_count,
                       (SELECT sum(hospital_count) FROM s)                          AS hospital_count,
                       (SELECT sum(park_count) FROM s)                              AS park_count,
                       (SELECT round(sum(park_area_km2)::numeric, 2) FROM s)        AS park_area_km2,
                       (SELECT round((sum(park_area_km2) / sum(area_km2) * 100)::numeric, 1) FROM s) AS park_ratio
                """,
                (rs, i) -> new DistrictSummary(
                        rs.getInt("cnt"),
                        rs.getDouble("total"),
                        new DistrictSummary.NamedArea(rs.getString("largest_name"), rs.getDouble("largest_km2")),
                        new DistrictSummary.NamedArea(rs.getString("smallest_name"), rs.getDouble("smallest_km2")),
                        mapStats(rs)));
    }
}
