package com.example.gisapi.analysis;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.gisapi.common.DistrictRef;
import com.example.gisapi.district.DistrictRepository;
import com.example.gisapi.util.ApiErrors;
import com.example.gisapi.util.GeoUtils;
import com.example.gisapi.util.SqlUtils;

/**
 * 반경 분석: 한 지점에서 반경 r(m) 안의 전철역/학교/병원/공원을 집계한다.
 * - 원 안 판정: ST_DWithin(geography) — 실제 미터 거리 기준
 * - 후보 거르기: geom && ST_Expand(...)로 공간 인덱스(GIST)를 먼저 탄다
 * - 가장 가까운 시설: ORDER BY geom <-> 점 (KNN 인덱스 검색)
 */
@RestController
@RequestMapping("/api/analysis")
public class RadiusAnalysisController {

    private static final int MIN_RADIUS = 100;
    private static final int MAX_RADIUS = 3000;

    private final JdbcTemplate jdbc;
    private final DistrictRepository districts;

    public RadiusAnalysisController(JdbcTemplate jdbc, DistrictRepository districts) {
        this.jdbc = jdbc;
        this.districts = districts;
    }

    /** /api/analysis/radius?lng=127.0276&lat=37.4979&r=500 */
    @GetMapping("/radius")
    public RadiusResult radius(@RequestParam double lng, @RequestParam double lat,
            @RequestParam(defaultValue = "500") int r) {
        if (r < MIN_RADIUS || r > MAX_RADIUS) {
            throw ApiErrors.badRequest("반경은 " + MIN_RADIUS + "~" + MAX_RADIUS + "m 사이여야 합니다");
        }
        // 서울 주변이 아닌 좌표는 거절 (오입력 방지)
        if (!GeoUtils.isNearSeoul(lng, lat)) {
            throw ApiErrors.badRequest("서울 주변 좌표가 아닙니다");
        }
        double pad = GeoUtils.metersToDegreePadding(r);

        DistrictRef district = districts.findContaining(lng, lat).orElse(null);

        List<RadiusResult.StationHit> stations = jdbc.query("""
                WITH c AS (SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) AS pt)
                SELECT st.name, st.lines,
                       round(ST_Distance(st.geom::geography, c.pt::geography)) AS d,
                       ST_X(st.geom) AS x, ST_Y(st.geom) AS y
                FROM subway_station st, c
                WHERE st.geom && ST_Expand(c.pt, ?)
                  AND ST_DWithin(st.geom::geography, c.pt::geography, ?)
                ORDER BY d
                """,
                (rs, i) -> new RadiusResult.StationHit(
                        rs.getString("name"),
                        SqlUtils.textList(rs, "lines"),
                        rs.getInt("d"), rs.getDouble("x"), rs.getDouble("y")),
                lng, lat, pad, r);

        // 학교·병원 위치 (지도에 강조 표시용)
        List<RadiusResult.PlaceHit> places = jdbc.query("""
                WITH c AS (SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) AS pt)
                SELECT p.category, p.name,
                       round(ST_Distance(p.geom::geography, c.pt::geography)) AS d,
                       ST_X(p.geom) AS x, ST_Y(p.geom) AS y
                FROM poi p, c
                WHERE p.category IN ('school', 'hospital')
                  AND p.geom && ST_Expand(c.pt, ?)
                  AND ST_DWithin(p.geom::geography, c.pt::geography, ?)
                ORDER BY d
                LIMIT 500
                """,
                (rs, i) -> new RadiusResult.PlaceHit(rs.getString("category"), rs.getString("name"),
                        rs.getInt("d"), rs.getDouble("x"), rs.getDouble("y")),
                lng, lat, pad, r);

        // 원 면적, 원에 걸친 공원 수, 원 안 공원 면적(겹치는 공원은 합친 뒤 원으로 자름)
        Map<String, Object> park = jdbc.queryForMap("""
                WITH c AS (SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) AS pt),
                     circle AS (SELECT ST_Buffer(c.pt::geography, ?)::geometry AS g FROM c),
                     hit AS (
                         SELECT p.geom FROM poi p, c
                         WHERE p.category = 'park'
                           AND p.geom && ST_Expand(c.pt, ?)
                           AND ST_DWithin(p.geom::geography, c.pt::geography, ?)
                     )
                SELECT (SELECT ST_Area(g::geography) FROM circle) / 1e6 AS circle_km2,
                       (SELECT count(*) FROM hit) AS park_count,
                       coalesce(ST_Area(ST_Intersection((SELECT ST_Union(geom) FROM hit),
                                                        (SELECT g FROM circle))::geography), 0) / 1e6 AS park_km2
                """, lng, lat, r, pad, r);
        double circleKm2 = ((Number) park.get("circle_km2")).doubleValue();
        double parkKm2 = ((Number) park.get("park_km2")).doubleValue();

        long schools = places.stream().filter(p -> p.category().equals("school")).count();
        long hospitals = places.size() - schools;

        RadiusResult.Counts counts = new RadiusResult.Counts(
                stations.size(), (int) schools, (int) hospitals, ((Number) park.get("park_count")).intValue());

        Map<String, RadiusResult.PlaceHit> nearest = new LinkedHashMap<>();
        nearestStation(lng, lat).ifPresent(p -> nearest.put("station", p));
        for (String category : List.of("school", "hospital", "park")) {
            nearestPoi(category, lng, lat).ifPresent(p -> nearest.put(category, p));
        }

        return new RadiusResult(
                new double[] { lng, lat }, r, district,
                SqlUtils.round(circleKm2, 3), counts,
                SqlUtils.round(parkKm2, 3), SqlUtils.round(circleKm2 > 0 ? parkKm2 / circleKm2 * 100 : 0, 1),
                stations, places, nearest);
    }

    private java.util.Optional<RadiusResult.PlaceHit> nearestStation(double lng, double lat) {
        return jdbc.query("""
                WITH c AS (SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) AS pt)
                SELECT st.name, round(ST_Distance(st.geom::geography, c.pt::geography)) AS d,
                       ST_X(st.geom) AS x, ST_Y(st.geom) AS y
                FROM subway_station st, c
                ORDER BY st.geom <-> c.pt
                LIMIT 1
                """,
                (rs, i) -> new RadiusResult.PlaceHit("station", rs.getString("name"), rs.getInt("d"),
                        rs.getDouble("x"), rs.getDouble("y")),
                lng, lat).stream().findFirst();
    }

    /** 공원은 폴리곤이라 경계에서 가장 가까운 점까지의 거리 (공원 안이면 0m) */
    private java.util.Optional<RadiusResult.PlaceHit> nearestPoi(String category, double lng, double lat) {
        return jdbc.query("""
                WITH c AS (SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) AS pt)
                SELECT p.name, round(ST_Distance(p.geom::geography, c.pt::geography)) AS d,
                       ST_X(ST_ClosestPoint(p.geom, c.pt)) AS x, ST_Y(ST_ClosestPoint(p.geom, c.pt)) AS y
                FROM poi p, c
                WHERE p.category = ? AND p.name IS NOT NULL
                ORDER BY p.geom <-> c.pt
                LIMIT 1
                """,
                (rs, i) -> new RadiusResult.PlaceHit(category, rs.getString("name"), rs.getInt("d"),
                        rs.getDouble("x"), rs.getDouble("y")),
                lng, lat, category).stream().findFirst();
    }
}
