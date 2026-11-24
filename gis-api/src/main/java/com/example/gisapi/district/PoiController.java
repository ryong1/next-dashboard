package com.example.gisapi.district;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.gisapi.common.ApiErrors;
import com.example.gisapi.common.GeoJson;
import com.example.gisapi.common.PoiCategory;

/** OSM 시설 위치 (지도 레이어용 GeoJSON) */
@RestController
@RequestMapping("/api/pois")
public class PoiController {

    private final JdbcTemplate jdbc;

    public PoiController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * /api/pois?category=subway|school|hospital|park
     * 서울 경계 안의 시설만 반환. 공원 폴리곤은 전송량을 줄이려고 단순화한다.
     */
    @GetMapping(produces = GeoJson.MEDIA_TYPE)
    public String byCategory(@RequestParam String category) {
        if (!PoiCategory.isValid(category)) {
            throw ApiErrors.badRequest("알 수 없는 category: " + category);
        }
        String feature = GeoJson.feature("p.id", """
                CASE WHEN p.category = 'park'
                     THEN ST_SimplifyPreserveTopology(p.geom, 0.00002)
                     ELSE p.geom END""",
                "json_build_object('name', p.name, 'category', p.category)");
        return jdbc.queryForObject(GeoJson.featureCollectionSql(feature, null, """
                FROM poi p
                WHERE p.category = ?
                  AND EXISTS (SELECT 1 FROM district d WHERE ST_Intersects(d.geom, p.geom))
                """), String.class, category);
    }
}
