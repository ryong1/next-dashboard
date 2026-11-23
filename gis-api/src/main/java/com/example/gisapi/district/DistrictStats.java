package com.example.gisapi.district;

/** 구별 OSM 시설 집계. parkRatio는 구 면적 대비 녹지 면적(%). */
public record DistrictStats(
        int subway,
        int school,
        int hospital,
        int park,
        double parkAreaKm2,
        double parkRatio) {
}
