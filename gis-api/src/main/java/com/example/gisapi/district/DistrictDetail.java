package com.example.gisapi.district;

import java.util.List;

import com.example.gisapi.common.DistrictRef;

/** 구 상세 정보. center는 [경도, 위도]. */
public record DistrictDetail(
        String code,
        String name,
        String nameEng,
        double areaKm2,
        double perimeterKm,
        double[] center,
        DistrictStats stats,
        List<SubwayStation> subwayStations,
        List<DistrictRef> neighbors) {
}
