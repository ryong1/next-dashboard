package com.example.gisapi.common;

import java.util.List;

/**
 * OSM 시설 분류 (poi.category 값). 데이터 파일 이름도 같다: resources/data/osm/{category}.geojson
 */
public final class PoiCategory {

    public static final String SUBWAY = "subway";
    public static final String SCHOOL = "school";
    public static final String HOSPITAL = "hospital";
    public static final String PARK = "park";

    public static final List<String> ALL = List.of(SUBWAY, SCHOOL, HOSPITAL, PARK);

    private PoiCategory() {
    }

    public static boolean isValid(String category) {
        return ALL.contains(category);
    }
}
