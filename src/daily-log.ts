export const DEFAULT_PREVIOUS_WORK_SECTION = "전일 진행 업무";
export const DEFAULT_TODAY_WORK_SECTION = "금일 예정 업무";

const DAILY_NOTE_DATE_RE = /(?:^|\/)(\d{4}-\d{2}-\d{2})(?=\s|\.md$|$)/;
const MONTH_FOLDER_RE = /^\d{4}-\d{2}$/;

/**
 * 얼마나 과거까지 거슬러 올라가 전일 노트를 찾을지.
 *
 * 속도보다 의미 때문에 둔다 — 1년 전 노트의 업무를 '전일 진행 업무' 로 끌어오는 것은
 * 그 자체로 틀린 동작이다. 후보를 전부 훑는 최악 경로를 함께 막는 효과도 있다.
 */
export const MAX_LOOKBACK_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` 에서 n 일을 뺀 `YYYY-MM-DD`. 시간대 영향을 받지 않게 UTC 로 센다. */
function subtractDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number
  ];
  const shifted = new Date(Date.UTC(year, month - 1, day) - days * MS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

function normalizeSectionHeading(line: string): string | null {
  const normalized = line.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/^\*\*\[\s*(.*?)\s*\]\*\*$/);
  return match ? match[1]!.replace(/\s+/g, " ").trim() : null;
}

function findSectionRange(
  content: string,
  sectionName: string
): { lines: string[]; bodyStart: number; bodyEnd: number } | null {
  const lines = content.split("\n");
  const normalizedName = sectionName.replace(/\s+/g, " ").trim();
  const headingIndex = lines.findIndex(
    (line) => normalizeSectionHeading(line) === normalizedName
  );

  if (headingIndex === -1) return null;

  const bodyStart = headingIndex + 1;
  let bodyEnd = lines.length;
  for (let i = bodyStart; i < lines.length; i++) {
    if (
      normalizeSectionHeading(lines[i]!) !== null ||
      /^\s*---+\s*$/.test(lines[i]!)
    ) {
      bodyEnd = i;
      break;
    }
  }

  return { lines, bodyStart, bodyEnd };
}

/**
 * 한 줄을 통째로 차지하는 Obsidian 주석(`%% ... %%`).
 *
 * 스크럼 영역 마커가 이 형태라, 마커를 섹션 안쪽에 두면 섹션 본문으로 딸려온다.
 * 섹션의 끝은 다음 `**[제목]**` 이나 `---` 로만 판단하기 때문이다. 그대로 옮기면
 * 받는 노트에 마커가 하나 더 생겨 스크럼 복사가 "한 쌍이어야 합니다" 로 깨진다.
 *
 * 줄 중간에 낀 주석은 건드리지 않는다. 여러 줄에 걸친 주석 블록도 다루지 않는다 —
 * 마커가 한 줄짜리라 여기까지면 충분하고, 더 넓히면 본문을 잘라먹을 위험이 커진다.
 */
const COMMENT_ONLY_LINE_RE = /^\s*%%.*%%\s*$/;

/** 주석 전용 줄을 걷어낸다. 업무 내용이 아니라 표식이므로 옮기지 않는다. */
function dropCommentOnlyLines(lines: string[]): string[] {
  return lines.filter((line) => !COMMENT_ONLY_LINE_RE.test(line));
}

function trimBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start]!.trim() === "") start++;
  while (end > start && lines[end - 1]!.trim() === "") end--;

  return lines.slice(start, end);
}

export function extractSection(
  content: string,
  sectionName: string
): string | null {
  const range = findSectionRange(content, sectionName);
  if (!range) return null;

  return trimBlankLines(
    dropCommentOnlyLines(range.lines.slice(range.bodyStart, range.bodyEnd))
  ).join("\n");
}

export function hasWorkContent(body: string | null): body is string {
  return body !== null && body.trim().length > 0;
}

export function replaceSection(
  content: string,
  sectionName: string,
  newBody: string
): string | null {
  const range = findSectionRange(content, sectionName);
  if (!range) return null;

  const existingBody = range.lines.slice(range.bodyStart, range.bodyEnd);
  let firstContentIndex = 0;
  let lastContentIndex = existingBody.length;
  while (
    firstContentIndex < lastContentIndex &&
    existingBody[firstContentIndex]!.trim() === ""
  ) {
    firstContentIndex++;
  }
  while (
    lastContentIndex > firstContentIndex &&
    existingBody[lastContentIndex - 1]!.trim() === ""
  ) {
    lastContentIndex--;
  }

  const leadingBlankLines = existingBody.slice(0, firstContentIndex);
  const trailingBlankLines = existingBody.slice(lastContentIndex);
  const replacement = trimBlankLines(newBody.split("\n"));
  return [
    ...range.lines.slice(0, range.bodyStart),
    ...leadingBlankLines,
    ...replacement,
    ...trailingBlankLines,
    ...range.lines.slice(range.bodyEnd),
  ].join("\n");
}

export function getDailyNoteDate(path: string): string | null {
  return DAILY_NOTE_DATE_RE.exec(path)?.[1] ?? null;
}

function getParentPath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

function getBaseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function normalizeFolder(folder: string): string {
  return folder.trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * 전일 노트를 탐색할 루트 폴더를 정한다.
 * - 설정값이 있으면 그대로 사용한다.
 * - 없으면 현재 노트의 부모 폴더. 단 부모가 `YYYY-MM` 형태의 월 폴더면
 *   한 단계 위를 쓴다. 월별로 노트를 나눠 담는 경우 매월 1일에
 *   전월 노트를 찾지 못하는 문제를 막기 위함이다.
 */
export function resolveSearchRoot(
  currentPath: string,
  configuredRoot?: string
): string {
  const configured = normalizeFolder(configuredRoot ?? "");
  if (configured) return configured;

  const parent = getParentPath(currentPath);
  return MONTH_FOLDER_RE.test(getBaseName(parent))
    ? getParentPath(parent)
    : parent;
}

function isWithinFolder(path: string, folder: string): boolean {
  return folder === "" || path.startsWith(`${folder}/`);
}

/**
 * 현재 노트보다 앞선 날짜의 데일리 노트 경로를 최신순으로 돌려준다.
 * 탐색 범위는 resolveSearchRoot 가 정한 루트 폴더의 하위 전체이고,
 * 과거로는 MAX_LOOKBACK_DAYS 일까지만 본다.
 */
export function getPreviousDailyNotePaths(
  currentPath: string,
  markdownPaths: string[],
  configuredRoot?: string
): string[] {
  const currentDate = getDailyNoteDate(currentPath);
  if (!currentDate) return [];

  const searchRoot = resolveSearchRoot(currentPath, configuredRoot);
  const oldestDate = subtractDays(currentDate, MAX_LOOKBACK_DAYS);

  return markdownPaths
    .filter(
      (path) => path !== currentPath && isWithinFolder(path, searchRoot)
    )
    .map((path) => ({ path, date: getDailyNoteDate(path) }))
    .filter(
      (candidate): candidate is { path: string; date: string } =>
        candidate.date !== null &&
        candidate.date < currentDate &&
        candidate.date >= oldestDate
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path)
    )
    .map((candidate) => candidate.path);
}
