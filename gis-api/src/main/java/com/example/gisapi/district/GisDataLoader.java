package com.example.gisapi.district;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 앱 시작 시 비어 있는 테이블에 GeoJSON 데이터를 적재하고, 구별 집계(district_stats)를 갱신한다.
 * GeoJSON 파싱은 PostGIS(ST_GeomFromGeoJSON)가 직접 처리한다.
 */
@Component
public class GisDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(GisDataLoader.class);

    /** OSM 시설 분류 (resources/data/osm/{category}.geojson) */
    public static final List<String> POI_CATEGORIES = List.of("subway", "school", "hospital", "park");

    private static final String INSERT_DISTRICTS = """
            INSERT INTO district (code, name, name_eng, geom)
            SELECT f -> 'properties' ->> 'SIG_CD',
                   f -> 'properties' ->> 'SIG_KOR_NM',
                   f -> 'properties' ->> 'SIG_ENG_NM',
                   ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326))
            FROM jsonb_array_elements(CAST(? AS jsonb) -> 'features') AS f
            """;

    // OSM 폴리곤은 꼬인 경우가 있어 ST_MakeValid로 보정하고 폴리곤 부분만 남긴다
    private static final String INSERT_POIS = """
            INSERT INTO poi (osm_id, category, name, geom)
            SELECT f -> 'properties' ->> 'osmId',
                   CAST(? AS varchar),
                   f -> 'properties' ->> 'name',
                   CASE WHEN CAST(? AS varchar) = 'park'
                        THEN ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326)), 3)
                        ELSE ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326)
                   END
            FROM jsonb_array_elements(CAST(? AS jsonb) -> 'features') AS f
            ON CONFLICT (category, osm_id) DO NOTHING
            """;

    private final JdbcTemplate jdbc;
    private final ResourceLoader resources;

    public GisDataLoader(JdbcTemplate jdbc, ResourceLoader resources) {
        this.jdbc = jdbc;
        this.resources = resources;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        boolean changed = false;

        if (count("SELECT count(*) FROM district") == 0) {
            int n = jdbc.update(INSERT_DISTRICTS, read("classpath:data/seoul-districts.geojson"));
            log.info("서울시 구 경계 {}건 적재", n);
            changed = true;
        }

        for (String category : POI_CATEGORIES) {
            if (count("SELECT count(*) FROM poi WHERE category = '" + category + "'") > 0) continue;
            String json = read("classpath:data/osm/" + category + ".geojson");
            int n = jdbc.update(INSERT_POIS, category, category, json);
            log.info("OSM {} {}건 적재", category, n);
            changed = true;
        }

        Boolean populated = jdbc.queryForObject(
                "SELECT ispopulated FROM pg_matviews WHERE matviewname = 'district_stats'", Boolean.class);
        if (changed || !Boolean.TRUE.equals(populated)) {
            long start = System.currentTimeMillis();
            jdbc.execute("REFRESH MATERIALIZED VIEW district_stats");
            log.info("구별 시설 집계(district_stats) 갱신: {}ms", System.currentTimeMillis() - start);
        }
    }

    private int count(String sql) {
        Integer n = jdbc.queryForObject(sql, Integer.class);
        return n == null ? 0 : n;
    }

    private String read(String location) throws IOException {
        return resources.getResource(location).getContentAsString(StandardCharsets.UTF_8);
    }
}
