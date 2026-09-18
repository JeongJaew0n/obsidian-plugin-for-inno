/**
 * 노트 안의 "마커로 감싼 영역"을 찾고 꺼내는 공용 코드.
 *
 * 마커 문자열만 다르면 되도록 쌍을 인자로 받는다. 형제 플러그인 my-obsidian-tools 가
 * 같은 코드를 쓰고 있어, 여기서 고친 버그는 그쪽에도 그대로 옮길 수 있게 경계를 맞췄다.
 */

/** 영역을 여닫는 마커 한 쌍. `label` 은 오류 메시지에 쓰는 사람 말 이름이다. */
export interface MarkerPair {
  start: string;
  end: string;
  label: string;
}

export interface Line {
  text: string;
  start: number;
  end: number;
  after: number;
  /** 코드 블록·frontmatter 밖이라 마커로 인정할 수 있는 줄인지. */
  structural: boolean;
}

/**
 * 원문의 오프셋과 줄바꿈을 그대로 유지하며 줄을 나눈다.
 * 코드 블록과 frontmatter 안은 마크다운 예시일 수 있으므로 마커로 보지 않는다.
 */
export function linesOf(text: string): Line[] {
  const lines: Line[] = [];
  const pattern = /([^\r\n]*)(\r\n|\n|\r|$)/g;
  let fence: { char: string; length: number } | undefined;
  let frontmatter = false;

  for (const match of text.matchAll(pattern)) {
    if (!match[0]) break;
    const line = match[1]!;
    const start = match.index!;
    let structural = !fence && !frontmatter;

    if (start === 0 && line === "---") {
      frontmatter = true;
      structural = false;
    } else if (frontmatter) {
      structural = false;
      if (/^(---|\.\.\.)\s*$/.test(line)) frontmatter = false;
    } else if (fence) {
      structural = false;
      const close = line.match(/^ {0,3}(`+|~+)\s*$/);
      if (close && close[1]![0] === fence.char && close[1]!.length >= fence.length) {
        fence = undefined;
      }
    } else {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (open && !(open[1]![0] === "`" && open[2]!.includes("`"))) {
        fence = { char: open[1]![0]!, length: open[1]!.length };
        structural = false;
      }
    }

    lines.push({
      text: line,
      start,
      end: start + line.length,
      after: start + match[0].length,
      structural,
    });
  }

  return lines;
}

export interface Region {
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
}

export function markerLines(text: string, markers: MarkerPair): Line[] {
  return linesOf(text).filter(
    (line) =>
      line.structural && [markers.start, markers.end].includes(line.text.trim())
  );
}

export function findRegion(
  text: string,
  markers: MarkerPair,
  missing?: string
): Region {
  const found = markerLines(text, markers);
  if (!found.length) {
    throw new Error(
      missing ?? `${markers.label} 표식이 없습니다. 먼저 영역을 만들어 주세요.`
    );
  }
  if (
    found.length !== 2 ||
    found[0]!.text.trim() !== markers.start ||
    found[1]!.text.trim() !== markers.end
  ) {
    throw new Error(
      `${markers.label}은 시작·끝 표식 한 쌍이어야 합니다. 누락·중복·순서를 확인하세요.`
    );
  }

  const [start, end] = found as [Line, Line];
  return {
    start: start.start,
    end: end.after,
    bodyStart: start.after,
    bodyEnd: end.start,
  };
}

export function assertNoMarkers(text: string, markers: MarkerPair): void {
  if (markerLines(text, markers).length) {
    throw new Error(
      `표식이 이미 있습니다. 한 노트에는 ${markers.label}을 하나만 만듭니다.`
    );
  }
}

export function extractRegion(
  text: string,
  markers: MarkerPair,
  missing?: string
): string {
  const region = findRegion(text, markers, missing);
  return text.slice(region.bodyStart, region.bodyEnd);
}
