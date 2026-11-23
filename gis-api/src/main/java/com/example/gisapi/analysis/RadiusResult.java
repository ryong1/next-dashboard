package com.example.gisapi.analysis;

import java.util.List;
import java.util.Map;

import com.example.gisapi.district.DistrictDetail;

/**
 * 반경 분석 결과.
 * center: [경도, 위도], radius: m, district: 중심점이 속한 구(서울 밖이면 null)
 */
public record RadiusResult(
        double[] center,
        int radius,
        DistrictDetail.Neighbor district,
        double circleAreaKm2,
        Counts counts,
        double parkAreaKm2,
        double parkRatio,
        List<StationHit> stations,
        List<PlaceHit> places,
        Map<String, PlaceHit> nearest) {

    /** 원 안 시설 수 (공원은 원에 걸친 공원 수) */
    public record Counts(int station, int school, int hospital, int park) {
    }

    public record StationHit(String name, List<String> lines, int distanceM, double lng, double lat) {
    }

    /** category: school | hospital | park | station */
    public record PlaceHit(String category, String name, int distanceM, double lng, double lat) {
    }
}
