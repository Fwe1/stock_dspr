import { seed, apply, applyAdminChange, refreshExpiry } from "./model.js";

export const sections = [
  ["기관 업무", [
    ["기관 재고","H/stock"],["전배 요청서","H/new"],["인근 전배처","H/candidates/TR-001"],
    ["보낸 요청","H/sent/TR-001"],["받은 요청","A/inbox/TR-001"],["출고 대기","A/transit/TR-001"],
    ["이송 중","H/transit/TR-001"],["수령 입력","H/transit/TR-001"],["수령 완료","H/transit/TR-001"],
    ["부분 수령","H/transit/TR-001"],["이송 실패","H/transit/TR-001"],["로트 입고","H/stock"],
    ["미배정 요청","H/sent/TR-001"],["재검색·배분 점수","H/candidates/TR-001"]
  ]],
  ["재고·기관 관리", [
    ["지역 수급","H/region"],["기관 비축 정책","H/floor"],["변경 이력","H/audit"],["전체 요청","H/all"],
    ["기관 관리","H/facilities"],["의약품 관리","H/medicines"],["재고 정합성 점검","H/reconcile"],
    ["불일치 점검 결과","H/reconcile/issues"],["기본 비축량","H/floor/defaults"],
    ["정책 적용 이력","H/floor/history"],["지역 경고 기준","H/floor/thresholds"]
  ]],
  ["운영·분석", [
    ["업무 운영 지표","H/ops"],["부하 측정 결과","H/ops/load"],["장애·복구","H/ops/recovery"],
    ["합성 수요 시나리오","H/lab"],["배분 정책 비교","H/lab/compare"],["예약 경합 시연","H/lab/race"],
    ["합성 수급 이벤트","H/lab/events"],["자료 출처","H/ops/sources"]
  ]]
];

export const screens = sections.flatMap(([, rows]) => rows);
const outcomes=[["예약 거절","H/sent/TR-001"],["예약 취소","H/sent/TR-001"],["예약 만료","H/sent/TR-001"]];
screens.push(...outcomes);
sections[0][1].push(...outcomes);
export function previewLink(name, path) {
  return "?demo=1&screen=" + (screens.findIndex(([label]) => label === name) + 1) + "#" + path;
}

// Each direct preview starts independently of the user's saved demo.
export function sampleState(name) {
  const db = seed();
  if (name === "미배정 요청") db.requests[0].qty = 200;
  if(["예약 거절","예약 취소","예약 만료"].includes(name)){
    apply(db,"H","hold","TR-001",{site:"A"});
    if(name==="예약 거절")apply(db,"A","reject","TR-001");
    if(name==="예약 취소")apply(db,"H","cancel","TR-001");
    if(name==="예약 만료"){db.requests[0].until=Date.now();refreshExpiry(db);}
  }
  const lifecycle = {
    "보낸 요청":1, "받은 요청":1, "출고 대기":2, "이송 중":3, "수령 입력":3,
    "수령 완료":4, "부분 수령":4, "이송 실패":4
  };
  const step = lifecycle[name] || 0;
  if (step >= 1) apply(db,"H","hold","TR-001",{site:"A"});
  if (step >= 2) apply(db,"A","accept","TR-001");
  if (step >= 3) apply(db,"A","ship","TR-001");
  if (step === 4) {
    if (name === "이송 실패") apply(db,"H","fail","TR-001",{reason:"운송 중 전량 미도착"});
    else apply(db,"H","receive","TR-001", name === "부분 수령" ? {good:18,bad:1} : {good:20,bad:0});
  }
  if (["변경 이력","정책 적용 이력"].includes(name)) {
    applyAdminChange(db,"A",0,{kind:"floor",expected:10,value:15,reason:"야간 병동 예비분"});
  }
  return db;
}
