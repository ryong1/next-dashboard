// gis-api 응답 타입 (백엔드 Java record와 같은 형태)

export type DistrictRef = { code: string; name: string };

export type DistrictStats = {
  subway: number;
  school: number;
  hospital: number;
  park: number;
  parkAreaKm2: number;
  parkRatio: number;
};

export type DistrictProperties = DistrictStats & {
  code: string;
  name: string;
  nameEng: string;
  areaKm2: number;
};

export type DistrictFeature = {
  type: "Feature";
  id: number;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
  properties: DistrictProperties;
};

export type DistrictCollection = {
  type: "FeatureCollection";
  features: DistrictFeature[];
};

export type SubwayStation = { name: string; lines: string[] };

export type DistrictDetail = DistrictRef & {
  nameEng: string;
  areaKm2: number;
  perimeterKm: number;
  center: [number, number];
  stats: DistrictStats;
  subwayStations: SubwayStation[];
  neighbors: DistrictRef[];
};

export type DistrictSummary = {
  count: number;
  totalAreaKm2: number;
  largest: { name: string; areaKm2: number };
  smallest: { name: string; areaKm2: number };
  totals: DistrictStats;
};

export type PoiCategory = "subway" | "school" | "hospital" | "park";

export type PoiCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    id: number;
    geometry: GeoJSON.Geometry;
    properties: { name: string | null; category: PoiCategory };
  }[];
};

export type RadiusPlace = {
  category: "school" | "hospital" | "park" | "station";
  name: string | null;
  distanceM: number;
  lng: number;
  lat: number;
};

export type RadiusResult = {
  center: [number, number];
  radius: number;
  district: DistrictRef | null;
  circleAreaKm2: number;
  counts: { station: number; school: number; hospital: number; park: number };
  parkAreaKm2: number;
  parkRatio: number;
  stations: { name: string; lines: string[]; distanceM: number; lng: number; lat: number }[];
  places: RadiusPlace[];
  nearest: Partial<Record<RadiusPlace["category"], RadiusPlace>>;
};
