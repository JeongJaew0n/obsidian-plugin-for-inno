/**
 * 데일리 스크럼 영역. 마커 사이 내용을 원문 그대로 꺼낸다.
 *
 * 데일리 노트에는 스크럼에 올릴 것과 개인 메모가 섞여 있어 매번 드래그로 범위를
 * 잡기 번거롭다. 마커로 감싼 영역만 복사한다.
 *
 * `%% %%` 는 Obsidian 주석이라 읽기 모드에서 숨고 소스 모드에서만 보인다.
 * 시작·끝을 따로 둔 것은 한 줄이 지워졌을 때 어느 쪽이 빠졌는지 알기 위해서다.
 *
 * 마커 문자열은 설정으로 빼지 않는다 — 바꾸면 기존 노트의 영역이 전부 깨진다.
 */
import { assertNoMarkers, extractRegion, type MarkerPair } from "./markers";

export const SCRUM_MARKERS: MarkerPair = {
  start: "%% inno-scrum:start %%",
  end: "%% inno-scrum:end %%",
  label: "스크럼 영역",
};

const MISSING =
  "스크럼 영역 표식이 없습니다. 먼저 '스크럼(scrum) 영역 넣기'를 실행하세요.";

export function extractScrum(text: string): string {
  const body = extractRegion(text, SCRUM_MARKERS, MISSING);
  // 빈 클립보드가 조용히 나가면 그대로 스크럼에 붙는다. 여기서 막는다.
  if (!body.trim()) {
    throw new Error("스크럼 영역이 비어 있습니다. 내용을 먼저 적어 주세요.");
  }
  return body;
}

export function assertNoScrumMarkers(text: string): void {
  assertNoMarkers(text, SCRUM_MARKERS);
}

/** 커서 자리에 넣을 빈 영역. 본문 양식은 넣지 않는다 — 사용자가 자유롭게 쓴다. */
export function newScrumRegion(eol = "\n"): string {
  return `${SCRUM_MARKERS.start}${eol}${eol}${SCRUM_MARKERS.end}${eol}`;
}
