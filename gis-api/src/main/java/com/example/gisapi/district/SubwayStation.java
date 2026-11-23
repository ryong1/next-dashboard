package com.example.gisapi.district;

import java.util.List;

/** 지하철역과 지나는 호선 (예: 합정 → ["2", "6"]) */
public record SubwayStation(String name, List<String> lines) {
}
