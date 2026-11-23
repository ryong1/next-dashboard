package com.example.gisapi.district;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 앱 시작 시 district 테이블이 비어 있으면 GeoJSON 파일을 읽어 넣는다.
 * GeoJSON 파싱은 PostGIS(ST_GeomFromGeoJSON)가 직접 처리한다.
 */
@Component
public class DistrictDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DistrictDataLoader.class);

    private static final String INSERT_SQL = """
            INSERT INTO district (code, name, name_eng, geom)
            SELECT f -> 'properties' ->> 'SIG_CD',
                   f -> 'properties' ->> 'SIG_KOR_NM',
                   f -> 'properties' ->> 'SIG_ENG_NM',
                   ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(f ->> 'geometry'), 4326))
            FROM jsonb_array_elements(CAST(? AS jsonb) -> 'features') AS f
            """;

    private final JdbcTemplate jdbc;
    private final Resource geojson;

    public DistrictDataLoader(JdbcTemplate jdbc,
            @Value("classpath:data/seoul-districts.geojson") Resource geojson) {
        this.jdbc = jdbc;
        this.geojson = geojson;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM district", Integer.class);
        if (count != null && count > 0) {
            log.info("district 테이블에 이미 {}건이 있어 적재를 건너뜀", count);
            return;
        }
        int inserted = jdbc.update(INSERT_SQL, geojson.getContentAsString(StandardCharsets.UTF_8));
        log.info("서울시 구 경계 {}건 적재 완료", inserted);
    }
}
