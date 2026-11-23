import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cacheLife } from "next/cache";
import pkg from "../package.json";

// 프로젝트 페이지용 실제 데이터: Git 커밋 기록 + 빌드 설정 파일
// (서버에서만 실행. 결과는 캐시되어 빌드 시점 / 몇 분 단위로만 다시 읽음)

export type Part = "프론트엔드" | "백엔드" | "데이터" | "문서" | "구조";

export type Commit = {
  hash: string;
  date: string; // YYYY-MM-DD HH:mm
  message: string;
  parts: Part[];
  files: number;
};

export type Component = {
  name: string;
  folder: string;
  role: string;
  stack: string[];
  commits: number;
  lastDate: string | null;
};

export type ProjectInfo = {
  commits: Commit[];
  trackedFiles: number;
  components: Component[];
};

const REPO_ROOT = path.resolve(process.cwd(), "..");

function git(args: string[]) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

/** 파일 경로로 어느 부분 작업인지 분류 (모노레포로 합치기 전 경로도 고려) */
function partOf(file: string): Part {
  if (/\.geojson$|\/scripts\/osm\//.test(file)) return "데이터";
  if (/\.md$/i.test(file) && !/AGENTS\.md$/.test(file)) return "문서";
  if (/^gis-api\/|^(src\/(main|test)\/|build\.gradle|settings\.gradle|gradlew|gradle\/)/.test(file)) return "백엔드";
  return "프론트엔드";
}

function readGradleBootVersion() {
  try {
    const gradle = readFileSync(path.join(REPO_ROOT, "gis-api", "build.gradle"), "utf8");
    return gradle.match(/org\.springframework\.boot' version '([^']+)'/)?.[1] ?? null;
  } catch {
    return null;
  }
}

const major = (v: string | undefined) => v?.replace(/^[^\d]*/, "").split(".")[0] ?? "?";

export async function getProjectInfo(): Promise<ProjectInfo | null> {
  "use cache";
  cacheLife("minutes");

  try {
    // 커밋마다 "@@해시|날짜|제목" 다음 줄부터 바뀐 파일 목록
    const log = git(["log", "--name-only", "--date=format:%Y-%m-%d %H:%M", "--pretty=format:@@%h|%ad|%s"]);
    const commits: Commit[] = log
      .split("@@")
      .filter(Boolean)
      .map((block) => {
        const [head, ...files] = block.trim().split("\n").filter(Boolean);
        const [hash, date, ...msg] = head.split("|");
        const parts = [...new Set(files.map(partOf))];
        return {
          hash,
          date,
          message: msg.join("|"),
          parts: parts.length ? parts : ["구조"],
          files: files.length,
        };
      });

    const trackedFiles = git(["ls-files"]).split("\n").filter(Boolean);

    const statsFor = (part: Part) => {
      const touched = commits.filter((c) => c.parts.includes(part));
      return { commits: touched.length, lastDate: touched[0]?.date ?? null };
    };

    const deps = pkg.dependencies as Record<string, string>;
    const boot = readGradleBootVersion();

    const components: Component[] = [
      {
        name: "next-dashboard",
        folder: "next-dashboard/",
        role: "지도 대시보드 화면",
        stack: [
          `Next.js ${deps.next}`,
          `React ${deps.react}`,
          `MapLibre GL ${major(deps["maplibre-gl"])}`,
          `Bootstrap ${major(deps.bootstrap)}`,
        ],
        ...statsFor("프론트엔드"),
      },
      {
        name: "gis-api",
        folder: "gis-api/",
        role: "공간 분석 REST API",
        stack: [boot ? `Spring Boot ${boot}` : "Spring Boot", "Java 17", "PostgreSQL 16", "PostGIS 3"],
        ...statsFor("백엔드"),
      },
      {
        name: "OSM 데이터",
        folder: "gis-api/scripts/osm/",
        role: "시설·지하철 데이터 수집/변환",
        stack: ["Overpass API", "osmtogeojson", "GeoJSON"],
        ...statsFor("데이터"),
      },
    ];

    return { commits, trackedFiles: trackedFiles.length, components };
  } catch {
    // git이 없는 환경(배포 서버 등)에서는 기록 없이 표시
    return null;
  }
}
