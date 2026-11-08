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
