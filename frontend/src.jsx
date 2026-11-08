import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

async function fetchList(path, signal) {
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("조회 실패");
  const payload = await response.json();
  if (!payload.success || !Array.isArray(payload.data)) throw new Error("응답 형식 오류");
  return payload.data;
}

function useList(path) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    fetchList(path, controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ path, attempt, state: "ready", data }); },
      () => { if (!controller.signal.aborted) setResult({ path, attempt, state: "error" }); }
    );
    return () => controller.abort();
  }, [path, attempt]);
  const current = result?.path === path && result.attempt === attempt ? result : { state: "loading" };
  return { ...current, retry: () => setAttempt(previous => previous + 1) };
}

function Message({ children, retry }) {
  return <div className="notice" role={retry ? "alert" : "status"}>
    {children}{retry && <button onClick={retry}>다시 시도</button>}
  </div>;
}

function StockRows({ facility, item }) {
  const path = "/facilities/" + facility.id + "/items/" + item.id + "/stocks";
  const stocks = useList(path);
  return <section className="ledger" aria-labelledby="stock-name">
    <div className="ledger-heading"><div><p>{facility.facilityName}</p><h2 id="stock-name">{item.name}</h2></div>
      {stocks.state === "ready" && <span>재고 기록 {stocks.data.length}건</span>}
    </div>
    {stocks.state === "loading" && <Message>재고를 불러오는 중입니다.</Message>}
    {stocks.state === "error" && <Message retry={stocks.retry}>재고를 불러오지 못했습니다.</Message>}
    {stocks.state === "ready" && (stocks.data.length === 0
      ? <Message>이 기관에 등록된 해당 의약품 재고가 없습니다.</Message>
      : <div className="scroll"><table aria-label={facility.facilityName + " " + item.name + " 재고"}>
        <thead><tr>{["재고 ID", "실재고", "예약 수량", "유효기간", "사용 상태"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{stocks.data.map(stock => <tr key={stock.id}>
          <th scope="row">{stock.id}</th><td>{stock.onHandQty.toLocaleString("ko-KR")}</td>
          <td>{stock.reservedQty.toLocaleString("ko-KR")}</td><td>{stock.expirationDate ?? "미등록"}</td>
          <td>{{ IN_USE: "사용 중", NOT_IN_USE: "사용 중지" }[stock.usageStatus] ?? "미지정"}</td>
        </tr>)}</tbody>
      </table></div>)}
  </section>;
}

function Inventory() {
  const facilities = useList("/facilities");
  const items = useList("/items");
  const [facilityId, setFacilityId] = useState("");
  const [itemId, setItemId] = useState("");
  const facility = facilities.data?.find(f => String(f.id) === facilityId);
  const item = items.data?.find(i => String(i.id) === itemId);
  return <>
    <header><div className="inner"><strong>Stock Dispenser</strong><span>기관 재고</span></div></header>
    <main className="inner"><h1>기관 재고 조회</h1>
      <div className="filters">
        <div><label htmlFor="facility">조회 기관</label>
          <select id="facility" value={facilityId} onChange={e => setFacilityId(e.target.value)} disabled={!facilities.data?.length}>
            <option value="">기관 선택</option>{facilities.data?.map(f => <option value={f.id} key={f.id}>{f.facilityName}</option>)}
          </select>
          {facilities.state === "error" && <Message retry={facilities.retry}>기관 목록 조회 실패</Message>}
          {facilities.state === "loading" && <small role="status">기관 목록을 불러오는 중입니다.</small>}
          {facilities.data?.length === 0 && <small role="status">등록된 기관이 없습니다.</small>}
        </div>
        <div><label htmlFor="item">의약품</label>
          <select id="item" value={itemId} onChange={e => setItemId(e.target.value)} disabled={!items.data?.length}>
            <option value="">의약품 선택</option>{items.data?.map(i => <option value={i.id} key={i.id}>{i.name}</option>)}
          </select>
          {items.state === "error" && <Message retry={items.retry}>의약품 목록 조회 실패</Message>}
          {items.state === "loading" && <small role="status">의약품 목록을 불러오는 중입니다.</small>}
          {items.data?.length === 0 && <small role="status">등록된 의약품이 없습니다.</small>}
        </div>
      </div>
      {facility && item
        ? <StockRows facility={facility} item={item} />
        : <section className="ledger"><h2>재고 내역</h2><Message>기관과 의약품을 선택하면 재고 내역이 표시됩니다.</Message></section>}
    </main>
  </>;
}

createRoot(document.getElementById("root")).render(<Inventory />);
