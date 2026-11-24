package com.example.gisapi.util;

/** 좌표·거리 관련 계산 (서울 위도 기준 근사) */
public final class GeoUtils {

    // 서울 주변 좌표 범위 (서울 경계보다 넉넉하게: 오입력이나 다른 도시 좌표를 걸러내는 용도)
    private static final double MIN_LNG = 126.6;
    private static final double MAX_LNG = 127.4;
    private static final double MIN_LAT = 37.3;
    private static final double MAX_LAT = 37.8;

    // 서울 위도(약 37.5°)에서 경도 1도 ≈ 88km. 후보를 놓치지 않도록 80km로 나눠 조금 넉넉하게 잡는다
    private static final double METERS_PER_DEGREE_SAFE = 80_000.0;

    private GeoUtils() {
    }

    /** 서울 주변 좌표인지 */
    public static boolean isNearSeoul(double lng, double lat) {
        return lng >= MIN_LNG && lng <= MAX_LNG && lat >= MIN_LAT && lat <= MAX_LAT;
    }

    /**
     * 반경(m)을 도 단위 여유값으로 바꾼다.
     * 공간 인덱스 후보 거르기(geom && ST_Expand(점, 도))에 쓰며, 실제 거리 판정은 ST_DWithin(geography)이 한다.
     */
    public static double metersToDegreePadding(double meters) {
        return meters / METERS_PER_DEGREE_SAFE;
    }
}
