package com.example.gisapi.common;

/** 구를 가리키는 최소 정보 (코드 + 이름). 이웃 구, 좌표가 속한 구 등 여러 응답에서 공통으로 쓴다. */
public record DistrictRef(String code, String name) {
}
