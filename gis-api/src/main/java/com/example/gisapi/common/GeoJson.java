package com.example.gisapi.common;

/**
 * GeoJSON 응답을 PostgreSQL에서 바로 만들기 위한 SQL 조각 모음.
 * 여러 API가 같은 FeatureCollection 틀을 쓰므로 여기서 한 번만 정의한다.
 */
public final class GeoJson {

    /** GeoJSON 응답의 Content-Type */
    public static final String MEDIA_TYPE = "application/geo+json";

    /** 좌표 소수점 자리수 (6자리 ≈ 0.1m) */
    private static final int PRECISION = 6;

    private GeoJson() {
    }

    /**
     * 한 행을 GeoJSON Feature로 만드는 SQL 식.
     *
     * @param idExpr         Feature id로 쓸 SQL 식 (없으면 null)
     * @param geometryExpr   도형 SQL 식 (geometry)
     * @param propertiesExpr properties로 쓸 json SQL 식 (보통 json_build_object(...))
     */
    public static String feature(String idExpr, String geometryExpr, String propertiesExpr) {
        return "json_build_object("
                + "'type', 'Feature', "
                + (idExpr == null ? "" : "'id', " + idExpr + ", ")
                + "'geometry', ST_AsGeoJSON(" + geometryExpr + ", " + PRECISION + ")::json, "
                + "'properties', " + propertiesExpr
                + ")";
    }

    /**
     * Feature 식을 모아 FeatureCollection 문자열 하나를 돌려주는 SELECT 문.
     *
     * @param featureExpr {@link #feature}로 만든 식
     * @param orderBy     Feature 순서 (없으면 null)
     * @param fromClause  "FROM ... WHERE ..." 부분
     */
    public static String featureCollectionSql(String featureExpr, String orderBy, String fromClause) {
        return "SELECT json_build_object("
                + "'type', 'FeatureCollection', "
                + "'features', COALESCE(json_agg(" + featureExpr
                + (orderBy == null ? "" : " ORDER BY " + orderBy)
                + "), '[]'::json)"
                + ")::text\n"
                + fromClause;
    }
}
