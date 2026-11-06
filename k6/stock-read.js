// 재고 조회 API 기준 측정 (DB만 쓴 상태 → 나중에 Redis 넣고 같은 스크립트로 비교)
// 실행: k6 run stock-read.js
// 다른 주소로: k6 run -e BASE_URL=http://localhost:8081 stock-read.js
// perf DB(더미 데이터)로 잴 때: k6 run -e ITEM_MAX=500 stock-read.js
// 초당 요청 수를 바꿀 때: k6 run -e ITEM_MAX=500 -e RATE=100 stock-read.js
//   → 데이터를 새로 만들지 않고, 품목 id 1~500 중 하나를 골라 조회
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };
const ITEM_MAX = Number(__ENV.ITEM_MAX || 0);
// 초당 요청 수. 기본 200, 바꾸려면 -e RATE=100
const RATE = Number(__ENV.RATE || 200);

export const options = {
  scenarios: {
    // JIT·커넥션 준비용. 결과에서는 뺀다
    warmup: {
      executor: 'constant-arrival-rate',
      rate: 50, timeUnit: '1s', duration: '10s',
      preAllocatedVUs: 20, maxVUs: 50,
      tags: { phase: 'warmup' },
    },
    // 실제 측정: 초당 200건을 30초 동안 일정하게 보낸다
    // DB만 / Redis 비교 때 이 숫자를 똑같이 둬야 공정한 비교가 된다
    measure: {
      executor: 'constant-arrival-rate',
      rate: RATE, timeUnit: '1s', duration: '30s',
      // 응답이 느려지면 동시에 기다리는 VU가 늘어난다. 측정 중에 VU를 새로 만들면 요청이 밀려 dropped가 생기므로 넉넉히 미리 만든다
      preAllocatedVUs: 200, maxVUs: 300,
      startTime: '10s',
      tags: { phase: 'measure' },
    },
  },
  thresholds: {
    // 목표값은 직접 정하는 값. 200ms는 예시
    'http_req_duration{phase:measure}': ['p(95)<200'],
    'http_req_failed{phase:measure}': ['rate<0.01'],
  },
  // 기본 요약에는 p(99)가 없어서 추가
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

// 측정 전에 한 번 실행: 품목 1개, 지점 5개, 지점마다 재고 4개(총 20개) 생성
// ITEM_MAX를 주면 이미 있는 데이터를 쓰므로 아무것도 만들지 않는다
export function setup() {
  if (ITEM_MAX > 0) {
    return { itemId: null };
  }
  const itemRes = http.post(`${BASE}/items`, JSON.stringify({ name: `k6-item-${Date.now()}` }), JSON_HEADERS);
  const itemId = itemRes.json('data.itemId');

  for (let f = 0; f < 5; f++) {
    const facRes = http.post(`${BASE}/facilities`, JSON.stringify({
      facilityName: `k6-지점-${f}`, address: '서울',
      latitude: 37.5 + f * 0.01, longitude: 127.0 + f * 0.01,
    }), JSON_HEADERS);
    const facilityId = facRes.json('data.facilityId');

    for (let s = 0; s < 4; s++) {
      http.post(`${BASE}/items/${itemId}/stocks`, JSON.stringify({
        facilityId, onHandQty: 100, expirationDate: '2027-12-31',
      }), JSON_HEADERS);
    }
  }
  return { itemId };
}

// 가상 사용자마다 반복: 품목의 재고 목록 조회
export default function (data) {
  const itemId = ITEM_MAX > 0 ? 1 + Math.floor(Math.random() * ITEM_MAX) : data.itemId;
  const res = http.get(`${BASE}/items/${itemId}/stocks`, {
    tags: { name: 'GET /items/{itemId}/stocks' },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
}
