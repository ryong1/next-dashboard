package com.example.gisapi.district;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.gisapi.util.GeoJson;

/** 지하철 노선도 레이어용 GeoJSON */
@RestController
@RequestMapping("/api/subway")
public class SubwayController {

    private final JdbcTemplate jdbc;

    public SubwayController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 전철 노선 (properties: ref, name, short, colour, sort). 순서가 앞인 노선이 위에 그려지도록 sort 역순 */
    @GetMapping(value = "/lines", produces = GeoJson.MEDIA_TYPE)
    public String lines() {
        String feature = GeoJson.feature("sort", "ST_SimplifyPreserveTopology(geom, 0.00001)", """
                json_build_object(
                    'ref', ref, 'name', name, 'short', short_name, 'colour', colour, 'sort', sort)""");
        return jdbc.queryForObject(
                GeoJson.featureCollectionSql(feature, "sort DESC", "FROM subway_line"), String.class);
    }

    /**
     * 서울 안 지하철역 (properties: name, lines, colour, transfer).
     * colour는 첫 번째 호선 색, transfer는 2개 이상 호선이 지나는 환승역 여부.
     */
    @GetMapping(value = "/stations", produces = GeoJson.MEDIA_TYPE)
    public String stations() {
        String feature = GeoJson.feature(null, "st.geom", """
                json_build_object(
                    'name', st.name,
                    'lines', to_json(st.lines),
                    'colour', coalesce(l.colour, '#888888'),
                    'transfer', cardinality(st.lines) > 1
                )""");
        return jdbc.queryForObject(GeoJson.featureCollectionSql(feature, "cardinality(st.lines)", """
                FROM subway_station st
                LEFT JOIN subway_line l ON l.ref = st.lines[1]
                WHERE EXISTS (SELECT 1 FROM district d WHERE ST_Contains(d.geom, st.geom))
                """), String.class);
    }
}
