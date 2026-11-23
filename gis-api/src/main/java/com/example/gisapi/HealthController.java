package com.example.gisapi;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 서버 상태 확인: 화면에서 "백엔드가 꺼졌는지 / DB가 문제인지"를 구분해 안내하는 데 쓴다.
 * 앱은 떠 있지만 DB 연결이 안 되면 503과 함께 database: DOWN을 돌려준다.
 */
@RestController
public class HealthController {

    private final JdbcTemplate jdbc;
    private final Instant startedAt = Instant.now();

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("startedAt", startedAt.toString());
        try {
            Map<String, Object> db = jdbc.queryForMap("""
                    SELECT postgis_lib_version() AS postgis,
                           (SELECT count(*) FROM district) AS districts
                    """);
            body.put("status", "UP");
            body.put("database", "UP");
            body.put("postgis", db.get("postgis"));
            body.put("districts", db.get("districts"));
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("status", "DOWN");
            body.put("database", "DOWN");
            body.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
        }
    }
}
