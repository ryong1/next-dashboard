# Seoul GIS Dashboard

서울시 자치구 경계를 PostGIS에 저장하고, Next.js 대시보드에서 지도로 보여주는 연습 프로젝트.

```
.
├─ next-dashboard/   프론트엔드: Next.js 16, Bootstrap 5, MapLibre GL
└─ gis-api/          백엔드: Spring Boot 4 (Java 17), PostgreSQL 16 + PostGIS 3
```

## 로컬 실행

1. **DB 준비** (최초 1회): PostgreSQL에 `gisdb` 생성 후 `gis-api/local.properties`에 비밀번호 작성
   자세한 내용은 [gis-api/README.md](gis-api/README.md) 참고
2. **백엔드** (http://localhost:8080)
   ```powershell
   cd gis-api
   .\gradlew.bat bootRun
   ```
3. **프론트엔드** (http://localhost:3000)
   ```powershell
   cd next-dashboard
   npm install
   npm run dev
   ```
   브라우저의 `/api/*` 요청은 Next.js rewrites로 백엔드(8080)에 전달된다.

## 주요 화면
- `/` 대시보드
- `/map` 서울시 자치구 지도: 면적·지하철역·학교·병원·공원 비율 중 기준을 골라 단계구분도로 표시, 시설 위치 레이어, 구 클릭 시 상세(순위·지하철역·이웃 구), 지표별 순위
