import React, { useState } from "react";
import { adjustmentNames, balance, items, reserved, sites } from "./model";

function ScopePicker({ org, item, page }) {
  function select(site, medicine) {
    location.hash = [site, page, medicine].join("/");
  }
  return <div className="admin-scope">
    <label>대상 기관<select value={org} onChange={e => select(e.target.value, item)}>
      {Object.entries(sites).map(([key, site]) => <option key={key} value={key}>{site.name}</option>)}
    </select></label>
    <label>대상 의약품<select value={item} onChange={e => select(org, e.target.value)}>
      {items.map((name, index) => <option key={name} value={index}>{name}</option>)}
    </select></label>
  </div>;
}

function ChangeForm({ draft, save, close }) {
  const [kind, setKind] = useState(draft.kind);
  const [qty, setQty] = useState(String(draft.expected));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const absolute = kind === "count" || kind === "floor";
  const after = absolute ? Number(qty) : draft.expected - Number(qty);
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await save({ ...draft, kind, value: Number(qty), reason });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return <form className="demo-form" onSubmit={submit}>
    <h2>{kind === "floor" ? "최소 비축량 변경" : draft.code + " 재고 조정"}</h2>
    <fieldset className="receipt-fields admin-fields" disabled={saving}>
      {kind !== "floor" && <label>조정 유형<select value={kind} onChange={e => {
        setKind(e.target.value); setQty(e.target.value === "count" ? String(draft.expected) : ""); setError("");
      }}><option value="count">실사 조정</option><option value="use" disabled={draft.damaged}>사용</option><option value="discard">폐기</option></select></label>}
      <label>{kind === "floor" ? "새 최소 비축량" : absolute ? "실사 후 실재고" : "차감 수량"}
        <input type="number" required step="1" min={absolute ? 0 : 1} max="2147483647" value={qty} onChange={e => setQty(e.target.value)}/>
      </label>
      <label className="wide">변경 사유<textarea required maxLength={300} value={reason} onChange={e => setReason(e.target.value)}/></label>
    </fieldset>
    <p>{kind === "floor" ? "최소 비축량" : "로트 실재고"} {draft.expected}개 → {qty === "" ? "—" : after + "개"}</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="actions"><button disabled={saving} className="primary">변경 저장</button><button type="button" onClick={close} disabled={saving}>닫기</button></div>
  </form>;
}

export function AdminInventory({ db, org, item, page, write }) {
  const floorPage = page === "floor";
  const summary = balance(db, org, item);
  const lots = db.lots.filter(l => l.site === org && l.item === item);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  function edit(change) { setSaved(null); setDraft(change); }
  async function save(change) {
    const entry = await write(org, item, change);
    setDraft(null);
    setSaved(entry);
  }
  return <>
    <ScopePicker {...{ org, item, page }}/>
    <section className="ledger">
      <div className="ledger-heading"><h2>{items[item]}</h2>
        {floorPage && !draft && <button className="primary" onClick={() => edit({ kind: "floor", expected: summary.floor })}>비축량 변경</button>}
      </div>
      <dl className="stock-totals"><div><dt>최소 비축량</dt><dd>{summary.floor}개</dd></div><div><dt>전배 가능 수량</dt><dd>{summary.available}개</dd></div></dl>
      {!floorPage && <div className="scroll"><table><thead><tr>{["로트 번호","유효기간","사용 상태","실재고","예약 수량","조정"].map(k => <th key={k}>{k}</th>)}</tr></thead>
        <tbody>{lots.map(l => <tr key={JSON.stringify([l.code, l.expiry, !!l.damaged])}>
          <th>{l.code}</th><td>{l.expiry}</td><td>{l.damaged ? "사용 불가" : l.expiry < new Date().toISOString().slice(0,10) ? "기한 경과" : "사용 중"}</td>
          <td>{l.qty}개</td><td>{l.damaged ? 0 : reserved(db,l)}개</td>
          <td><button disabled={!!draft} onClick={() => edit({ kind:"count", code:l.code, expiry:l.expiry, damaged:!!l.damaged, expected:l.qty })}>조정</button></td>
        </tr>)}</tbody></table>{lots.length === 0 && <p className="notice">조정할 로트가 없습니다.</p>}</div>}
      {draft && <ChangeForm draft={draft} save={save} close={() => setDraft(null)}/>}
      {saved && <p className="confirmation" role="status">{adjustmentNames[saved.kind]}을 기록했습니다. {saved.before}개 → {saved.after}개</p>}
      <div className="admin-links"><a href={`#${org}/stock/${item}`}>기관 재고 보기</a><a href={`#${org}/audit/${item}`}>이 품목의 변경 이력</a></div>
    </section>
  </>;
}

export function AdminHistory({ db, org, item }) {
  const [site, setSite] = useState(item == null ? "" : org);
  const [medicine, setMedicine] = useState(item ?? "");
  const entries = (db.adminHistory ?? []).filter(e => (!site || e.site === site) && (medicine === "" || e.item === Number(medicine)));
  return <>
    <div className="admin-scope">
      <label>이력 기관<select value={site} onChange={e => setSite(e.target.value)}><option value="">전체 기관</option>
        {Object.entries(sites).map(([id,s]) => <option key={id} value={id}>{s.name}</option>)}</select></label>
      <label>이력 의약품<select value={medicine} onChange={e => setMedicine(e.target.value)}><option value="">전체 의약품</option>
        {items.map((name,i) => <option key={name} value={i}>{name}</option>)}</select></label>
    </div>
    <section className="ledger"><h2>관리자 변경 기록 {entries.length}건</h2>
      {!entries.length ? <p className="notice">해당 조건의 재고 조정·비축량 변경 기록이 없습니다.</p> :
        <div className="scroll"><table className="audit-table"><thead><tr>{["변경 시각 · 처리자","기관 · 의약품","변경 유형","수량 변경","전배 가능 수량","변경 사유"].map(k => <th key={k}>{k}</th>)}</tr></thead>
          <tbody>{entries.map(e => <tr key={e.id}><td>{new Date(e.at).toLocaleString("ko-KR")}<small>{e.actor}</small></td>
            <td>{sites[e.site].name}<small>{items[e.item]}</small></td><td>{adjustmentNames[e.kind]}{e.code && <small>{e.code} · {e.expiry}{e.damaged && " · 사용 불가"}</small>}</td>
            <td>{e.before}개 → {e.after}개</td><td>{e.beforeAvailable}개 → {e.afterAvailable}개</td><td>{e.reason}</td></tr>)}</tbody>
        </table></div>}
    </section>
  </>;
}
