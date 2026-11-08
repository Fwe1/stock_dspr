# 기관 재고 화면

Node.js 22.12 이상에서 프론트엔드를 실행한다.

```sh
cd frontend
npm ci
npm run dev
```

브라우저 단독 시연은 `http://localhost:5173/inventory/?demo=1#H/sent`에서 연다. 가상 기관을 바꾸며 요청·예약·출고·수령을 처리할 수 있다. 시연 기록은 같은 브라우저에 저장된다. 실제 API를 사용하려면 Java 21에서 Spring 서버도 실행한다.

개발 화면은 `http://localhost:5173/inventory/`에서 열린다. Vite는 기관·품목·재고 조회를 기본값 `http://localhost:8080`으로 전달한다. 백엔드 포트가 다르면 `STOCK_API_ORIGIN`을 설정한다.

Spring과 함께 제공하려면 `frontend`에서 `npm run build`를 먼저 실행한 뒤 프로젝트 루트에서 `./gradlew bootRun`을 실행한다. Windows에서는 `.\gradlew.bat bootRun`을 사용한다. 화면 주소는 `/inventory/index.html`이다.

로그인 전 단계이므로 기관 선택은 조회 조건이다. 기존 로트 목록 API인 `GET /facilities/{facilityId}/items/{itemId}/stocks`에서도 두 ID에 해당하는 재고를 조회할 수 있다. 각 로트의 `id`는 재고 레코드를 식별한다.

기관·의약품을 선택하고 **로트 입고 등록**에서 로트 번호, 입고 수량, 유효기간, 사유를 입력한다. 서버가 등록을 확인하면 해당 기관·품목의 목록을 다시 조회한다. 같은 로트와 유효기간으로 추가 입고하면 기존 행에 합산된다. 서버 응답을 받지 못한 경우 ‘등록 결과 다시 확인’은 같은 요청 번호를 재사용한다.

**전배 요청**에서 선택한 기관과 의약품의 필요 수량, 필요 시각, 수령지, 검색 반경, 우선순위와 사유를 등록한다. 등록 후 **보낸 요청**에서 서버가 부여한 요청 번호와 미배정 상태를 확인한다. 등록과 목록 조회는 각각 `POST`와 `GET /facilities/{facilityId}/transfer-requests`를 사용한다. 요청을 등록해도 실재고와 예약 수량은 변하지 않는다.

재고 화면은 `GET /facilities/{facilityId}/items/{itemId}/stock-overview`로 로트와 합계를 함께 조회한다. 전배 가능 수량은 사용 중이고 유효기간이 지나지 않은 로트의 미예약 수량에서 기관·품목의 최소 비축량을 한 번 뺀 값이다. 운영 중지 기관과 음수 결과는 0개로 표시한다. 기존 유효기간 미등록 로트는 기존 예약 기준을 따른다. 최소 비축량은 `facility_inventory.safety_stock_qty`를 읽고 설정이 없으면 0개를 적용한다. 화면은 입고 직후와 창으로 돌아올 때, 열려 있는 동안 5초 간격으로 갱신한다.
