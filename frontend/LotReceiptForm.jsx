import React, { useRef, useState } from "react";
import { readPending, savePending, forgetPending } from "./pendingRequest";

function today() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

export default function LotReceiptForm({ facility, item, onCancel, onSaved, setBusy }) {
  const storageKey = "receipt-pending:" + facility.id + "/" + item.id;
  const [unconfirmed, setUnconfirmed] = useState(() => readPending(storageKey));
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState(() => unconfirmed ?? { lotNumber: "", quantity: "", expirationDate: "", reason: "" });

  function update(event) {
    setFields({ ...fields, [event.target.name]: event.target.value });
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const lotNumber = fields.lotNumber.trim(), reason = fields.reason.trim();
    if (!lotNumber || !reason) {
      setError("로트 번호와 입고 사유를 입력해 주세요.");
      return;
    }
    const payload = unconfirmed ?? { ...fields, lotNumber, reason, quantity: Number(fields.quantity), requestId: crypto.randomUUID() };
    savePending(storageKey, payload);
    inFlight.current = true;
    setBusy(true);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/facilities/" + facility.id + "/items/" + item.id + "/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if ([400, 404, 409].includes(response.status) && body.success === false) {
        forgetPending(storageKey);
        setUnconfirmed(null);
        setError(body.message || "입고 정보를 확인해 주세요.");
        return;
      }
      if (!response.ok) throw new Error();
      if (!body.success || !body.data?.stockId) throw new Error();
      forgetPending(storageKey);
      onSaved({ lotNumber, quantity: Number(fields.quantity), stockId: body.data.stockId });
    } catch {
      setUnconfirmed(payload);
      setError("서버의 등록 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.");
    } finally {
      inFlight.current = false;
      setBusy(false);
      setPending(false);
    }
  }

  return <form className="receipt" onSubmit={submit}>
    <h3>로트 입고 등록</h3>
    <p className="receipt-context">{facility.facilityName} · {item.name}</p>
    <fieldset disabled={pending || !!unconfirmed}><div className="receipt-fields">
      <label>로트 번호<input name="lotNumber" required maxLength={64} value={fields.lotNumber} onChange={update} autoFocus /></label>
      <label>입고 수량<input name="quantity" type="number" min="1" max="2147483647" step="1" required value={fields.quantity} onChange={update} /></label>
      <label>유효기간<input name="expirationDate" type="date" min={today()} required value={fields.expirationDate} onChange={update} /></label>
      <label>입고 사유<input name="reason" maxLength={200} required value={fields.reason} onChange={update} /></label>
    </div></fieldset>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="actions"><button className="primary" disabled={pending}>
      {pending ? "등록 중…" : unconfirmed ? "등록 결과 다시 확인" : "입고 등록"}
    </button><button type="button" disabled={pending} onClick={onCancel}>닫기</button></div>
  </form>;
}
