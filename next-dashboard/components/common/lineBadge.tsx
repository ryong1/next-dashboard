import { lineOf } from "../../common/constants/subwayLines";
import styles from "./lineBadge.module.css";

// 밝은 노선색(우이신설, 경의중앙, 수인분당 등) 위에서는 흰 글자가 안 보이므로 어두운 글자로
function textColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.3 ? "#1f2a44" : "#ffffff";
}

type Props = { line: string; size?: "sm" | "md" };

/** 노선 배지: 1~9호선은 숫자 원, 나머지는 짧은 이름이 들어간 둥근 표시 */
export default function LineBadge({ line, size = "md" }: Props) {
  const meta = lineOf(line);
  const numeric = /^[1-9]$/.test(meta.ref);
  return (
    <span
      className={`${styles.badge} ${numeric ? styles.circle : styles.pill} ${size === "sm" ? styles.sm : ""}`}
      style={{ background: meta.color, color: textColor(meta.color) }}
      title={meta.name}
      aria-label={meta.name}
    >
      {meta.short}
    </span>
  );
}
