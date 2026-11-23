package com.example.gisapi.district;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 지하철 노선도 레이어용 GeoJSON */
@RestController
@RequestMapping("/api/subway")
public class SubwayController {

    private final JdbcTemplate jdbc;

    public SubwayController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 1~9호선 노선 (properties: ref, name, colour) */
    @GetMapping(value = "/lines", produces = "application/geo+json")
    public String lines() {
        return jdbc.queryForObject("""
                SELECT json_build_object(
                         'type', 'FeatureCollection',
                         'features', COALESCE(json_agg(json_build_object(
                             'type', 'Feature',
                             'id', ref::int,
                             'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00001), 6)::json,
                             'properties', json_build_object('ref', ref, 'name', name, 'colour', colour)
                         ) ORDER BY ref DESC), '[]'::json)
                       )::text
                FROM subway_line
                """, String.class);
    }

    /**
     * 서울 안 지하철역 (properties: name, lines, colour, transfer).
     * colour는 첫 번째 호선 색, transfer는 2개 이상 호선이 지나는 환승역 여부.
     */
    @GetMapping(value = "/stations", produces = "application/geo+json")
    public String stations() {
        return jdbc.queryForObject("""
                SELECT json_build_object(
                         'type', 'FeatureCollection',
                         'features', COALESCE(json_agg(json_build_object(
                             'type', 'Feature',
                             'geometry', ST_AsGeoJSON(st.geom, 6)::json,
                             'properties', json_build_object(
                                 'name', st.name,
                                 'lines', to_json(st.lines),
                                 'colour', coalesce(l.colour, '#888888'),
                                 'transfer', cardinality(st.lines) > 1
                             )
                         ) ORDER BY cardinality(st.lines)), '[]'::json)
                       )::text
                FROM subway_station st
                LEFT JOIN subway_line l ON l.ref = st.lines[1]
                WHERE EXISTS (SELECT 1 FROM district d WHERE ST_Contains(d.geom, st.geom))
                """, String.class);
    }
}
