# 기관 재고 화면

Java 21로 Spring 서버를 실행한 뒤 Node.js 22.12 이상에서 프론트엔드를 실행한다.

```sh
cd frontend
npm ci
npm run dev
```

개발 화면은 `http://localhost:5173/inventory/`에서 열린다. Vite는 기관·품목·재고 조회를 기본값 `http://localhost:8080`으로 전달한다. 백엔드 포트가 다르면 `STOCK_API_ORIGIN`을 설정한다.

Spring과 함께 제공하려면 `frontend`에서 `npm run build`를 먼저 실행한 뒤 프로젝트 루트에서 `./gradlew bootRun`을 실행한다. Windows에서는 `.\gradlew.bat bootRun`을 사용한다. 화면 주소는 `/inventory/index.html`이다.

기관과 의약품을 선택하면 `GET /facilities/{facilityId}/items/{itemId}/stocks`가 두 ID에 해당하는 재고만 조회한다. 로그인 전 단계이므로 기관 선택은 조회 조건이다. 서버 응답의 `id`는 재고 레코드를 식별한다.

기관·의약품을 선택하고 **로트 입고 등록**에서 로트 번호, 입고 수량, 유효기간, 사유를 입력한다. 서버가 등록을 확인하면 해당 기관·품목의 목록을 다시 조회한다. 같은 로트와 유효기간으로 추가 입고하면 기존 행에 합산된다. 서버 응답을 받지 못한 경우 ‘등록 결과 다시 확인’은 같은 요청 번호를 재사용한다.

**전배 요청**에서 선택한 기관과 의약품의 필요 수량, 필요 시각, 수령지, 검색 반경, 우선순위와 사유를 등록한다. 등록 후 **보낸 요청**에서 서버가 부여한 요청 번호와 미배정 상태를 확인한다. 등록과 목록 조회는 각각 `POST`와 `GET /facilities/{facilityId}/transfer-requests`를 사용한다. 요청을 등록해도 실재고와 예약 수량은 변하지 않는다.
