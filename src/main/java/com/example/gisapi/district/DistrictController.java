package com.example.gisapi.district;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/districts")
public class DistrictController {

    private final DistrictRepository repository;

    public DistrictController(DistrictRepository repository) {
        this.repository = repository;
    }

    /** 서울시 25개 구 경계 (GeoJSON FeatureCollection) */
    @GetMapping(produces = "application/geo+json")
    public String all() {
        return repository.findAllAsGeoJson();
    }

    /** 전체 요약: 구 개수, 총면적, 가장 큰/작은 구 */
    @GetMapping(value = "/summary", produces = MediaType.APPLICATION_JSON_VALUE)
    public DistrictSummary summary() {
        return repository.summary();
    }

    /** 좌표가 속한 구 찾기: /api/districts/locate?lng=126.97&lat=37.56 */
    @GetMapping(value = "/locate", produces = MediaType.APPLICATION_JSON_VALUE)
    public DistrictDetail.Neighbor locate(@RequestParam double lng, @RequestParam double lat) {
        return repository.findContaining(lng, lat)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "서울시 밖의 좌표입니다"));
    }

    /** 구 상세: 면적, 둘레, 중심점, 이웃 구 */
    @GetMapping(value = "/{code}", produces = MediaType.APPLICATION_JSON_VALUE)
    public DistrictDetail detail(@PathVariable String code) {
        return repository.findDetail(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "없는 구 코드: " + code));
    }
}
