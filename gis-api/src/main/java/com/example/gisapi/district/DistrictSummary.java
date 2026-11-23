package com.example.gisapi.district;

/** 서울시 전체 요약. totals는 25개 구 집계의 합(녹지율은 서울 전체 면적 대비). */
public record DistrictSummary(
        int count,
        double totalAreaKm2,
        NamedArea largest,
        NamedArea smallest,
        DistrictStats totals) {

    public record NamedArea(String name, double areaKm2) {
    }
}
