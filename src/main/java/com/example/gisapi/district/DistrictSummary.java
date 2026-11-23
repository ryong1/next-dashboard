package com.example.gisapi.district;

public record DistrictSummary(
        int count,
        double totalAreaKm2,
        NamedArea largest,
        NamedArea smallest) {

    public record NamedArea(String name, double areaKm2) {
    }
}
