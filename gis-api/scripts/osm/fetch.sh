#!/usr/bin/env sh
# 서울(KR-11) 지하철역/학교/병원/공원을 Overpass API에서 받아 GeoJSON으로 변환한다.
# 사용법 (Git Bash): cd gis-api/scripts/osm && npm install && sh fetch.sh
set -e
RAW=./raw
OUT=../../src/main/resources/data/osm
mkdir -p "$RAW"
q() {
  curl -sS --fail -m 300 https://overpass-api.de/api/interpreter \
    --data-urlencode "data=[out:json][timeout:240];area[\"ISO3166-2\"=\"KR-11\"][admin_level=4]->.s;$2" \
    -o "$RAW/$1.json"
  echo "$1: $(wc -c < "$RAW/$1.json") bytes"
}
q subway   'node["railway"="station"]["station"="subway"](area.s);out body;'
q school   'nwr["amenity"="school"](area.s);out center tags;'
q hospital 'nwr["amenity"="hospital"](area.s);out center tags;'
q park     '(way["leisure"="park"](area.s);relation["leisure"="park"](area.s););out geom;'
q subway_line 'relation["route"="subway"](area.s);out geom;'
q subway_stop 'relation["route"="subway"](area.s)->.r;(.r;node(r.r:"stop");node(r.r:"stop_entry_only");node(r.r:"stop_exit_only"););out body;'
node convert.js "$RAW" "$OUT"
