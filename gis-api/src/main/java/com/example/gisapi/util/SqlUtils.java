package com.example.gisapi.util;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

/** JDBC 결과 변환·숫자 처리 공통 함수 */
public final class SqlUtils {

    private SqlUtils() {
    }

    /** PostgreSQL text[] 컬럼을 List로 (NULL이면 빈 목록) */
    public static List<String> textList(ResultSet rs, String column) throws SQLException {
        Array array = rs.getArray(column);
        return array == null ? List.of() : List.of((String[]) array.getArray());
    }

    /** 소수점 digits 자리 반올림 */
    public static double round(double value, int digits) {
        double f = Math.pow(10, digits);
        return Math.round(value * f) / f;
    }
}
