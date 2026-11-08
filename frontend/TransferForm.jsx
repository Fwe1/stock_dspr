import React, { useRef, useState } from "react";

import { readPending, savePending, forgetPending } from "./pendingRequest";

export function transferStorageKey(facility, item) {
  return "transfer-pending:" + facility.id + "/" + item.id;
}

function localDateTime(iso) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function TransferForm({ facility, item, setBusy, onClose, onSaved }) {
  const storageKey = transferStorageKey(facility, item);
  const [pending, setPending] = useState(() => readPending(storageKey));
  const inFlight = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState(() => ({
    quantity: pending?.quantity ?? "", neededAt: localDateTime(pending?.neededAt ?? Date.now() + 3600000),
    destination: pending?.destination ?? facility.address ?? "", radiusKm: pending?.radiusKm ?? 10,
    priority: pending?.priority ?? "NORMAL", reason: pending?.reason ?? ""
  }));
  function change(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
    setError("");
  }
  async function submit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!pending && (!fields.destination.trim() || !fields.reason.trim())) {
      setError("수령지와 요청 사유를 입력해 주세요.");
      return;
    }
    if (!pending && new Date(fields.neededAt).getTime() <= Date.now()) {
      setError("필요 시각을 현재 이후로 지정해 주세요.");
      return;
    }
    const body = pending ?? {
      itemId: item.id, quantity: Number(fields.quantity), neededAt: new Date(fields.neededAt).toISOString(),
      destination: fields.destination.trim(), radiusKm: Number(fields.radiusKm), priority: fields.priority,
      reason: fields.reason.trim(), idempotencyKey: crypto.randomUUID()
    };
    inFlight.current = true;
    setBusy(true); setSending(true); setPending(body); setError("");
    try {
      savePending(storageKey, body);
      const response = await fetch("/facilities/" + facility.id + "/transfer-requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const result = await response.json();
      if ([400, 404, 409].includes(response.status) && result.success === false) {
        forgetPending(storageKey); setPending(null);
        setError(result.message || "요청 내용을 확인해 주세요."); return;
      }
      if (!response.ok || !result.success || !result.data?.requestNumber) throw new Error();
      forgetPending(storageKey);
      onSaved(result.data);
    } catch {
      setError("등록 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.");
    } finally {
      inFlight.current = false; setBusy(false); setSending(false);
    }
  }
  return <form className="receipt" onSubmit={submit}>
    <h3>전배 요청 작성</h3><p className="receipt-context">요청기관 {facility.facilityName} · {item.name}</p>
    <fieldset disabled={sending || !!pending}><div className="receipt-fields">
      <label>필요 수량<input type="number" autoFocus name="quantity" min="1" max="2147483647" step="1" required value={fields.quantity} onChange={change}/></label>
      <label>필요 시각<input type="datetime-local" name="neededAt" required value={fields.neededAt} onChange={change}/></label>
      <label>수령지<input name="destination" required maxLength={200} value={fields.destination} onChange={change}/></label>
      <label>검색 반경<select name="radiusKm" value={fields.radiusKm} onChange={change}>{[3,5,10].map(n => <option key={n} value={n}>{n} km</option>)}</select></label>
      <label>우선순위<select name="priority" value={fields.priority} onChange={change}><option value="NORMAL">일반</option><option value="URGENT">긴급</option></select></label>
      <label>요청 사유<input name="reason" required maxLength={500} value={fields.reason} onChange={change}/></label>
    </div></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="actions"><button className="primary" disabled={sending || (!pending && facility.operationStatus === "SUSPENDED")}>{sending ? "등록 중…" : pending ? "등록 결과 다시 확인" : "요청 등록"}</button>
    <button type="button" disabled={sending} onClick={onClose}>닫기</button></div>
  </form>;
}
