import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import LotReceiptForm from "./LotReceiptForm.jsx";
import TransferForm, { transferStorageKey } from "./TransferForm.jsx";
import { readPending } from "./pendingRequest";
import Demo from "./demo/Demo";
import "./style.css";

function isOverview(data) {
  return Array.isArray(data?.lots) && Number.isSafeInteger(data.availableQty) && Number.isInteger(data.safetyStockQty);
}

async function fetchData(path, signal, validate) {
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("조회 실패");
  const payload = await response.json();
  if (!payload.success || !validate(payload.data)) throw new Error("응답 형식 오류");
  return payload.data;
}

function useData(path, validate = Array.isArray, refreshMs = 0) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let timer;
    let loading = false;
    async function refresh() {
      if (loading || controller.signal.aborted) return;
      clearTimeout(timer);
      loading = true;
      try {
        const data = await fetchData(path, controller.signal, validate);
        if (!controller.signal.aborted) setResult({ path, attempt, state: "ready", data });
      } catch {
        if (!controller.signal.aborted) setResult({ path, attempt, state: "error" });
      } finally {
        loading = false;
        if (refreshMs && !controller.signal.aborted) timer = setTimeout(refresh, refreshMs);
      }
    }
    refresh();
    if (refreshMs) window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [path, attempt, validate, refreshMs]);
  const current = result?.path === path && result.attempt === attempt ? result : { state: "loading" };
  return { ...current, retry: () => setAttempt(previous => previous + 1) };
}

function Message({ children, retry }) {
  return <div className="notice" role={retry ? "alert" : "status"}>
    {children}{retry && <button onClick={retry}>다시 시도</button>}
  </div>;
}

function StockRows({ facility, item, setBusy, onRequestSaved }) {
  const path = "/facilities/" + facility.id + "/items/" + item.id + "/stock-overview";
  const stocks = useData(path, isOverview, 5000);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const suspended = facility.operationStatus === "SUSPENDED";
  const retryTransfer = !!readPending(transferStorageKey(facility, item));
  function complete(receipt) {
    setSaved(receipt);
    setForm(null);
    stocks.retry();
  }
  return <section className="ledger" aria-labelledby="stock-name">
    <div className="ledger-heading"><div><p>{facility.facilityName}</p><h2 id="stock-name">{item.name}</h2></div>
      <div className="actions">{stocks.state === "ready" && <span>재고 기록 {stocks.data.lots.length}건</span>}
        {!form && <><button onClick={() => { setSaved(null); setForm("receipt"); }}>로트 입고 등록</button>
          <button className="primary" disabled={suspended && !retryTransfer} onClick={() => { setSaved(null); setForm("transfer"); }}>전배 요청</button></>}
      </div>
    </div>
    {suspended && <p className="notice">운영 중지된 기관은 새 전배 요청을 등록할 수 없습니다.</p>}
    {form === "transfer" && <TransferForm facility={facility} item={item} setBusy={setBusy} onClose={() => setForm(null)} onSaved={onRequestSaved} />}
    {form === "receipt" && <LotReceiptForm facility={facility} item={item} setBusy={setBusy}
      onCancel={() => setForm(null)} onSaved={complete} />}
    {saved && <p role="status" className="confirmation">{saved.lotNumber} · {saved.quantity.toLocaleString("ko-KR")}개 입고를 기록했습니다.</p>}
    {stocks.state === "loading" && <Message>재고를 불러오는 중입니다.</Message>}
    {stocks.state === "error" && <Message retry={stocks.retry}>재고를 불러오지 못했습니다.</Message>}
    {stocks.state === "ready" && <dl className="stock-totals">
      <div><dt>최소 비축량</dt><dd>{stocks.data.safetyStockQty.toLocaleString("ko-KR")}개</dd></div>
      <div><dt>전배 가능 수량</dt><dd>{stocks.data.availableQty.toLocaleString("ko-KR")}개</dd></div>
    </dl>}
    {stocks.state === "ready" && (stocks.data.lots.length === 0
      ? <Message>이 기관에 등록된 해당 의약품 재고가 없습니다.</Message>
      : <div className="scroll"><table aria-label={facility.facilityName + " " + item.name + " 재고"}>
        <thead><tr>{["재고 ID", "로트 번호", "실재고", "예약 수량", "유효기간", "사용 상태"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{stocks.data.lots.map(stock => <tr key={stock.id} className={saved?.stockId === stock.id ? "received" : undefined}>
          <th scope="row">{stock.id}</th><td>{stock.lotNumber ?? "미등록"}</td><td>{stock.onHandQty.toLocaleString("ko-KR")}</td>
          <td>{stock.reservedQty.toLocaleString("ko-KR")}</td><td>{stock.expirationDate ?? "미등록"}{stock.expired && <strong className="expiry-note">기한 경과</strong>}</td>
          <td>{{ IN_USE: "사용 중", NOT_IN_USE: "사용 중지" }[stock.usageStatus] ?? "미지정"}</td>
        </tr>)}</tbody>
      </table></div>)}
  </section>;
}

function SentRequests({ facility, confirmation }) {
  const requests = useData("/facilities/" + facility.id + "/transfer-requests");
  return <section className="ledger"><h2>{facility.facilityName} · 보낸 요청</h2>
    {confirmation && <p className="confirmation" role="status">{confirmation} 요청을 등록했습니다.</p>}
    {requests.state === "loading" && <Message>보낸 요청을 불러오는 중입니다.</Message>}
    {requests.state === "error" && <Message retry={requests.retry}>보낸 요청을 불러오지 못했습니다.</Message>}
    {requests.state === "ready" && (requests.data.length === 0
      ? <Message>이 기관에서 보낸 전배 요청이 없습니다.</Message>
      : <div className="scroll"><table aria-label="보낸 요청"><thead><tr>
        {["요청 번호","의약품","필요 수량","우선순위","상태","상세"].map(h => <th key={h} scope="col">{h}</th>)}
      </tr></thead><tbody>{requests.data.map(r => <tr key={r.requestNumber}>
        <th scope="row">{r.requestNumber}</th><td>{r.itemName}</td><td>{r.quantity.toLocaleString("ko-KR")}</td>
        <td>{r.priority === "URGENT" ? "긴급" : "일반"}</td><td>{r.status === "REQUESTED" ? "미배정" : r.status}</td>
        <td><details><summary>요청 내용</summary><dl>
          <dt>필요 시각</dt><dd>{new Date(r.neededAt).toLocaleString("ko-KR")}</dd>
          <dt>수령지</dt><dd>{r.destination}</dd><dt>검색 반경</dt><dd>{r.radiusKm} km</dd>
          <dt>요청 사유</dt><dd>{r.reason}</dd></dl></details></td>
      </tr>)}</tbody></table></div>)}
  </section>;
}

function Inventory() {
  const [busy, setBusy] = useState(false);
  const facilities = useData("/facilities");
  const items = useData("/items");
  const [facilityId, setFacilityId] = useState(() => new URLSearchParams(location.search).get("facility") || "");
  const [itemId, setItemId] = useState(() => new URLSearchParams(location.search).get("item") || "");
  const [sent, setSent] = useState(() => new URLSearchParams(location.search).get("view") === "sent");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    const url = new URL(location.href);
    for (const [key, value] of [["facility", facilityId], ["item", itemId], ["view", sent ? "sent" : ""]]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
  }, [facilityId, itemId, sent]);
  const facility = facilities.data?.find(f => String(f.id) === facilityId);
  const item = items.data?.find(i => String(i.id) === itemId);
  return <>
    <header><div className="inner"><strong>Stock Dispenser</strong><span>기관 재고</span></div></header>
    <main className="inner"><nav className="section-nav" aria-label="기관 업무">
      <button aria-current={!sent ? "page" : undefined} disabled={busy} onClick={() => { setSent(false); setConfirmation(""); }}>기관 재고</button>
      <button aria-current={sent ? "page" : undefined} disabled={busy} onClick={() => setSent(true)}>보낸 요청</button>
      <a className="demo-entry" href="?demo=1#H/sent">가상 기관 업무 시연</a>
    </nav><h1>{sent ? "보낸 전배 요청" : "기관 재고 조회"}</h1>
      <div className="filters">
        <div><label htmlFor="facility">조회 기관</label>
          <select id="facility" value={facilityId} onChange={e => { setFacilityId(e.target.value); setConfirmation(""); }} disabled={busy || !facilities.data?.length}>
            <option value="">기관 선택</option>{facilities.data?.map(f => <option value={f.id} key={f.id}>{f.facilityName}</option>)}
          </select>
          {facilities.state === "error" && <Message retry={facilities.retry}>기관 목록 조회 실패</Message>}
          {facilities.state === "loading" && <small role="status">기관 목록을 불러오는 중입니다.</small>}
          {facilities.data?.length === 0 && <small role="status">등록된 기관이 없습니다.</small>}
        </div>
        {!sent && <div><label htmlFor="item">의약품</label>
          <select id="item" value={itemId} onChange={e => setItemId(e.target.value)} disabled={busy || !items.data?.length}>
            <option value="">의약품 선택</option>{items.data?.map(i => <option value={i.id} key={i.id}>{i.name}</option>)}
          </select>
          {items.state === "error" && <Message retry={items.retry}>의약품 목록 조회 실패</Message>}
          {items.state === "loading" && <small role="status">의약품 목록을 불러오는 중입니다.</small>}
          {items.data?.length === 0 && <small role="status">등록된 의약품이 없습니다.</small>}
        </div>}
      </div>
      {sent ? (facility ? <SentRequests key={facility.id} facility={facility} confirmation={confirmation} /> : <Message>보낸 요청을 조회할 기관을 선택해 주세요.</Message>) : facility && item
        ? <StockRows key={facility.id + "/" + item.id} facility={facility} item={item} setBusy={setBusy} onRequestSaved={r => { setConfirmation(r.requestNumber); setSent(true); }} />
        : <section className="ledger"><h2>재고 내역</h2><Message>기관과 의약품을 선택하면 재고 내역이 표시됩니다.</Message></section>}
    </main>
  </>;
}

const query = new URLSearchParams(location.search);
const demo = location.protocol === "file:" || query.has("demo");
createRoot(document.getElementById("root")).render(demo ? <Demo/> : <Inventory/>);
