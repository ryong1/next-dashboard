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
- `/` 서울시 자치구 지도: 지표별 단계구분도, 시설·전철 노선 레이어, 구 상세, 반경 분석
- `/projects` Git 기록 기반 프로젝트 현황
- `/statistics` 구별 시설 밀도 통계

## 코드 구조: 공통 코드(common)
각 프로젝트 안에서 여러 곳이 같이 쓰는 코드는 `common`에 모은다.

```
next-dashboard/
├─ common/
│  ├─ api/          client.ts (fetch·오류·서버 상태), gisApi.ts (엔드포인트 호출)
│  ├─ types.ts      API 응답 타입
│  ├─ constants/    metrics.ts (지도 지표), subwayLines.ts (노선 19개), mapLayers.ts (시설 레이어·반경)
│  ├─ utils/        format.ts (숫자·거리 표기), quantile.ts (5분위 경계)
│  ├─ hooks/        useApiData.ts (불러오기+다시 시도), useIsDesktop.ts
│  ├─ styles/       controls.module.css (알약 버튼·색 점·역 칩)
│  └─ server/       projectInfo.ts (서버 전용: git log, 빌드 설정)
└─ components/common/   LineBadge, ServerStatus, ServerErrorNotice, PageHeader

gis-api/src/main/java/com/example/gisapi/
├─ GisApiApplication.java      앱 시작점 (최상위에 있어야 하위 패키지를 모두 스캔함)
├─ district/  analysis/  health/   기능별 API (/api/districts·subway·pois, /api/analysis, /api/health)
├─ common/                     여러 기능이 같이 쓰는 형태·상수·설정
│  ├─ DistrictRef.java         {code, name} 공통 응답 형태
│  ├─ PoiCategory.java         시설 분류 상수
│  └─ ApiExceptionHandler.java 모든 오류 응답을 {timestamp, status, error, message, path}로 통일
└─ util/                       상태 없는 정적 도우미 함수
   ├─ GeoJson.java             GeoJSON 응답용 SQL 조각, Content-Type
   ├─ GeoUtils.java            서울 주변 좌표 판정, 반경(m) → 인덱스 후보용 도 단위 여유값
   ├─ SqlUtils.java            text[] → List, 반올림
   └─ ApiErrors.java           badRequest / notFound
```
