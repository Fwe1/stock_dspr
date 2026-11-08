import {useDirectory} from "./DirectoryContext";
import React, {useState} from "react";
import district from "./district.svg";
import {ChangeForm} from "./AdminInventory";
import {MovementTable} from "./PageParts";
import {freshness} from "./directory";
import {labels,candidates,balance,reserved} from "./model.js";

const when = t => new Date(t).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
function localTime() {
  const d=new Date(Date.now()+3600000);
  return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function Facts({rows}) {
  return <dl className="demo-facts">{rows.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}
export function NewRequest({org,run,go}) {
  const {sites,items}=useDirectory();
  async function submit(e) {
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const id=await run("new",null,{item:Number(f.get("item")),qty:Number(f.get("qty")),due:+new Date(f.get("due")),range:Number(f.get("range")),dest:f.get("dest").trim(),reason:f.get("reason").trim(),priority:f.get("priority")});
    if(id) go("candidates",id);
  }
  return <form onSubmit={submit} className="demo-form"><h2>요청 정보</h2><div className="receipt-fields">
    <label>의약품<select name="item">{items.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></label>
    <label>필요 수량<input required name="qty" type="number" min="1" max="2147483647" defaultValue="20"/></label>
    <label>필요 시각<input required name="due" type="datetime-local" defaultValue={localTime()}/></label>
    <label>검색 반경<select name="range" defaultValue="5">{[1,3,5,10].map(n=><option key={n} value={n}>{n} km</option>)}</select></label>
    <label>수령지<input required name="dest" defaultValue={sites[org].name+" 본관 약제실"} maxLength={200}/></label>
    <label>우선순위<select name="priority"><option>일반</option><option>긴급</option></select></label>
    <label className="wide">요청 사유<textarea required name="reason" maxLength={500}/></label>
  </div><button className="primary">요청 등록 및 후보 조회</button></form>;
}
export function Stock({db,org,run,go,write,initialItem=0,showIntake=false}) {
  const {sites,items}=useDirectory();
  const [item,setItem]=useState(initialItem), [open,setOpen]=useState(showIntake);
  const [draft,setDraft]=useState(null);
  const times=freshness(db,sites[org]);
  const lots=db.lots.filter(l=>l.site===org && l.item===item), total=balance(db,org,item);
  async function submit(e) {
    e.preventDefault();const f=new FormData(e.currentTarget);
    if(await run("intake",null,{item,qty:Number(f.get("qty")),code:f.get("code").trim(),expiry:f.get("expiry"),reason:f.get("reason").trim()}))setOpen(false);
  }
  return <><label className="demo-select">의약품<select value={item} onChange={e=>{setDraft(null);setItem(Number(e.target.value));}}>{items.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></label>
  <section className="ledger"><div className="ledger-heading"><h2>로트별 재고</h2><div className="actions"><button onClick={()=>setOpen(!open)}>로트 입고 등록</button><button className="primary" onClick={()=>go("new")}>전배 요청 작성</button></div></div>
  <dl className="stock-totals"><div><dt>최소 비축량</dt><dd>{total.floor}개</dd></div><div><dt>전배 가능 수량</dt><dd>{total.available}개</dd></div></dl>
  <p className="screen-note">원천 갱신 {when(times.source)} · 화면 반영 {when(times.projected)} · {times.stale?"갱신 지연":"정상"}</p>
  {open && <form onSubmit={submit} className="demo-form"><div className="receipt-fields"><label>로트 번호<input required name="code" maxLength={64}/></label><label>입고 수량<input required name="qty" type="number" min="1" max="2147483647"/></label><label>유효기간<input required name="expiry" type="date"/></label><label>입고 사유<input name="reason" required defaultValue="정기 입고"/></label></div><button className="primary">입고 등록</button></form>}
  <div className="scroll"><table><thead><tr>{["로트 번호","실재고","예약 수량","유효기간","사용 상태","조정"].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{lots.map(l=><tr key={[l.code,l.expiry,!!l.damaged].join("/")}><th>{l.code}</th><td>{l.qty}</td><td>{l.damaged?0:reserved(db,l)}</td><td>{l.expiry}</td><td>{l.damaged?"사용 불가":l.expiry<new Date().toISOString().slice(0,10)?"기한 경과":"사용 중"}</td><td><button onClick={()=>setDraft({kind:"count",code:l.code,expiry:l.expiry,damaged:!!l.damaged,expected:l.qty})}>조정</button></td></tr>)}</tbody></table></div>{draft&&<ChangeForm draft={draft} close={()=>setDraft(null)} save={async change=>{await write(org,item,{...change,actor:sites[org].name+" 담당자"});setDraft(null);}}/>}<details><summary>재고 이동 이력</summary><MovementTable entries={(db.movements??[]).filter(m=>m.site===org&&m.item===item)}/></details></section></>;
}
function MapView({from,points,selected,choose}) {
  const {sites,items}=useDirectory();
  const origin=sites[from];
  return <svg className="demo-map" role="img" aria-label="요청기관과 인근 제공기관의 모의 위치" viewBox="320 125 690 365">
    <image href={district} x="0" y="0" width="1360" height="497"/>
    {origin.located && selected && sites[selected].located && <line x1={origin.x} y1={origin.y} x2={sites[selected].x} y2={sites[selected].y} stroke="#365fb5" strokeDasharray="5 4"/>}
    {[{id:from},...points].filter(p=>sites[p.id].located).map(({id,reason})=>{const s=sites[id]; return <g key={id} onClick={choose && id!==from?()=>choose(id):undefined} className={choose?"map-site":""}>
      <circle cx={s.x} cy={s.y} r={selected===id?9:6} fill={reason?"#657580":"#194ec9"} stroke="white" strokeWidth="3"/>
      <text x={s.x} y={s.y-14} textAnchor="middle">{s.name}</text></g>})}
  </svg>;
}
export function Candidates({db,r,run,go,scored=false}) {
  const {sites,items}=useDirectory();
  const [choice,setChoice]=useState(null), [refresh,setRefresh]=useState("");
  const [range,setRange]=useState(r.range);
  const [policy,setPolicy]=useState(scored?"종합 점수":"최근접");
  const list=candidates(db,r);
  if(policy==="종합 점수")list.sort((a,b)=>Number(!!a.reason)-Number(!!b.reason)||a.score-b.score||(a.expiry??"").localeCompare(b.expiry??"")||a.km-b.km||a.id.localeCompare(b.id));
  const selected=list.find(c=>c.id===choice)??list[0];
  return <><div className="demo-subhead"><h2>{items[r.item]} · {r.qty}개</h2><span>{r.id} · 반경 {r.range} km</span></div>
    <MapView from={r.from} points={list} selected={selected?.id} choose={setChoice}/>
    <div className="demo-subhead"><h2>전량 제공 후보 {list.filter(c=>!c.reason).length}곳</h2>
      <div className="actions"><label>검색 반경 <select value={range} onChange={e=>setRange(Number(e.target.value))}>{[1,3,5,10].map(n=><option key={n} value={n}>{n} km</option>)}</select></label>
      <button onClick={async()=>{if(await run("search",r.id,{range}))setRefresh(new Date().toLocaleTimeString("ko-KR"))}}>다시 검색</button></div></div>
    <label className="demo-select">후보 정렬<select value={policy} onChange={e=>{setPolicy(e.target.value);setChoice(null);}}><option>최근접</option><option>종합 점수</option></select></label>
    {policy==="종합 점수"&&<p className="screen-note">거리 40% · 재고 여유 30% · 잔여 유효기간 20% · 처리 부하 10%. 제공 가능 기관 중 점수가 낮은 순으로 표시합니다.</p>}
    {refresh && <p role="status">{refresh} 기준으로 조회했습니다.</p>}
    {!list.some(c=>!c.reason) && <p className="notice">요청 조건을 충족하는 기관이 없습니다. 아래에서 제외 사유를 확인하세요.</p>}
    <div className="scroll"><table><thead><tr>{["기관","거리","전배 가능 수량","유효기간","원천 갱신","화면 반영","자료 상태","조회 결과",...(policy==="종합 점수"?["배분 점수"]:[])].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{list.map(c=><tr className={c.id===selected?.id?"received":""} key={c.id}><th><button className="text-btn" aria-pressed={c.id===selected?.id} onClick={()=>setChoice(c.id)}>{sites[c.id].name}</button></th><td>{sites[c.id].located&&sites[r.from].located?c.km.toFixed(1)+" km":"—"}</td><td>{c.available}개</td><td>{c.expiry??"—"}</td><td>{when(c.source)}</td><td>{when(c.projected)}</td><td>{c.stale?"갱신 지연":"정상"}</td><td><span>{c.reason.split(" · ")[0]||"전량 제공 가능"}</span>{c.reason.includes(" · ")&&<small> · {c.reason.split(" · ")[1]}</small>}</td>{policy==="종합 점수"&&<td>{c.reason?"—":c.score.toFixed(3)}</td>}</tr>)}</tbody></table></div>
    <div className="demo-decision"><span>{sites[selected.id].name} · 요청 {r.qty}개</span><div className="actions"><button onClick={()=>go("sent",r.id)}>보낸 요청</button><button disabled={!!selected.reason || r.state!=="open"} className="primary" onClick={async()=>{if(await run("hold",r.id,{site:selected.id,policy}))go("sent",r.id)}}>임시 예약</button></div></div></>;
}
export function RequestDetail({r,org,admin,run,go,initialMode=""}) {
  const {sites,items}=useDirectory();
  const [mode,setMode]=useState(initialMode);
  const sender=r.from===org && !admin, provider=r.to===org && !admin;
  async function submit(e) {
    e.preventDefault();const f=new FormData(e.currentTarget);
    if(await run(mode,r.id,{good:Number(f.get("good")),bad:Number(f.get("bad")),reason:f.get("reason")}))setMode("");
  }
  const next = r.state==="open" && sender;
  return <article className="demo-detail"><div className="demo-subhead"><h2>{items[r.item]} {r.qty}개 요청</h2><strong>{labels[r.state]}</strong></div>
    {r.to && <MapView from={r.from} points={[{id:r.to}]} selected={r.to}/>}
    <Facts rows={[["요청 번호",r.id],["요청기관",sites[r.from].name],["제공기관",sites[r.to]?.name??"미배정"],["필요 시각",when(r.due)+" · "+r.priority],["수령지",r.dest],["요청 사유",r.reason],...(r.state==="held"?[["응답 기한",when(r.until)]]:[])]}/>
    {r.alloc && <p>배정 로트 · {r.alloc.map(a=>a.code+" ("+a.qty+"개)").join(", ")}</p>}
    {r.decision&&<details><summary>배정 판단 근거</summary><p>{r.decision.policy} · {r.decision.version} · 종합 점수 {r.decision.score.toFixed(3)}</p><p>거리 / 재고 / 유효기간 / 부하 가중치 {r.decision.weights.join(" / ")}%</p></details>}
    {r.receipt && <section><h3>{r.receipt.missing||r.receipt.bad?"부분 수령 내역":"수령 내역"}</h3><Facts rows={[["실제 수령",(r.receipt.good+r.receipt.bad)+"개"],["정상 수령",r.receipt.good+"개"],["사용 불가",r.receipt.bad+"개"],["미도착",r.receipt.missing+"개"]]}/></section>}
    <div className="actions">
    {next && <button className="primary" onClick={()=>go("candidates",r.id)}>인근 전배처 찾기</button>}
    {sender && ["open","held"].includes(r.state) && <button onClick={()=>run("cancel",r.id)}>요청 취소</button>}
    {provider && r.state==="held" && <><button className="primary" onClick={()=>run("accept",r.id)}>요청 수락</button><button onClick={()=>run("reject",r.id)}>요청 거절</button></>}
    {provider && r.state==="accepted" && <button className="primary" onClick={()=>run("ship",r.id)}>출고 처리</button>}
    {sender && r.state==="shipped" && <><button className="primary" onClick={()=>setMode("receive")}>수령 입력</button><button onClick={()=>setMode("fail")}>이송 실패 기록</button></>}
    </div>
    {sender && r.state==="shipped" && mode && <form className="demo-form" key={mode} onSubmit={submit}>{mode==="receive"?<div className="receipt-fields"><label>정상 수령 수량<input type="number" min="0" max={r.qty} name="good" required defaultValue={r.qty}/></label><label>사용 불가 수량<input type="number" min="0" max={r.qty} name="bad" required defaultValue="0"/></label></div>:<label>실패 사유<input required name="reason" maxLength={300}/></label>}<button className="primary">{mode==="receive"?"수령 확정":"실패 확정"}</button></form>}
    <h3>처리 이력</h3><ol className="demo-history">{r.history.map((h,i)=><li key={i}>{h.text}<small>{when(h.time)}</small></li>)}</ol></article>;
}
