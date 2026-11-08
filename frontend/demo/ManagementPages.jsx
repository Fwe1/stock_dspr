import React, {useState} from "react";
import {effectiveFloor,regionStats,reconciledLots} from "./model";
import {catalogRows,zones} from "./directory";
import {useDirectory} from "./DirectoryContext";
import {Field, GridTable, PageTabs, MovementTable} from "./PageParts";
import {AdminInventory} from "./AdminInventory";

const initialLimits = {warn:100, danger:70, mult:1};
const facilityFields = [
  ["name","기관명"],["type","기관 유형"],["address","주소"],["zone","권역",["서부권","동부권"]],
  ["latitude","위도"],["longitude","경도"],["cycle","재고 갱신 주기 (분)"],["status","운영 상태",["운영 중","운영 중지"]],
  ["shipping","이송 가능 여부",["가능","불가"]]
];
const medicineFields = [["name","의약품명"],["ref","품목 식별값"],["ingredient","성분"],["dose","규격"],["unit","수량 단위"],["storage","보관조건"]];
export function Catalog({page,db,update}) {
  const facility=page==="facilities", noun=facility?"기관":"의약품";
  const fields=facility?facilityFields:medicineFields;
  const records=catalogRows(db,page);
  const [error,setError]=useState("");
  const [edit,setEdit]=useState(null);
  const [search,setSearch]=useState("");
  const rows=records.filter(r=>r.name.includes(search)||r.id.includes(search)).map(r=>[
    r.id,r.name,...(facility?[r.zone,r.type,r.status]:[r.ref,r.ingredient,r.storage]),
    <button onClick={()=>setEdit(r)}>수정</button>
  ]);
  async function submit(e) {
    e.preventDefault();
    const record={...Object.fromEntries(new FormData(e.currentTarget)),id:edit.id || "DEMO-"+(records.length+1)};
    try {
      await update(d=>{
        const list=catalogRows(d,page);
        if(!facility && list.some(r=>r.ref===record.ref && r.id!==edit.id))throw new Error("이미 등록된 품목 식별값입니다.");
        d.catalogHistory??=[];d.catalogHistory.unshift({at:Date.now(),page,name:record.name,kind:edit.id?"수정":"등록",source:"시연 수기 입력"});
        d.catalog??={};d.catalog[page]=edit.id?list.map(r=>r.id===edit.id?record:r):[...list,{...record,id:"DEMO-"+(list.length+1)}];
      });
      setError("");setEdit(null);
    } catch(e){setError(e.message);}
  }
  return <><div className="demo-subhead"><label>{noun} 검색<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 또는 ID"/></label>
    <button className="primary" onClick={()=>setEdit({})}>{noun} 등록</button></div>
    <GridTable caption={noun+" 목록"} heads={facility?["기관 ID","기관명","권역","유형","운영상태","관리"]:["내부 ID","의약품명","품목 식별값","성분","보관조건","관리"]} rows={rows}/>
    {edit&&<form key={edit.id||"new"} className="demo-form" onSubmit={submit}><h2>{noun} {edit.id?"수정":"등록"}</h2><div className="receipt-fields">
      {fields.map(([name,label,options])=><Field key={name} name={name} label={label} options={options} value={edit[name]} required={!["latitude","longitude"].includes(name)} {...(name==="cycle"?{type:"number",min:1}:name==="latitude"||name==="longitude"?{type:"number",step:"any",min:name==="latitude"?-90:-180,max:name==="latitude"?90:180}:{})}/>)}
    </div>{error&&<p role="alert" className="form-error">{error}</p>}<div className="actions"><button className="primary">목록에 적용</button><button type="button" onClick={()=>{setEdit(null);setError("");}}>닫기</button></div></form>}
    <details><summary>기준정보 갱신 이력</summary><GridTable caption="기준정보 갱신 이력" heads={["시각","대상","변경","출처"]} rows={(db.catalogHistory??[]).filter(h=>h.page===page).map(h=>[new Date(h.at).toLocaleString("ko-KR"),h.name,h.kind,h.source])} empty="외부 자료 수신 또는 수기 변경 기록이 없습니다."/></details>
  </>;
}

export function Region({db}) {
  const [zone,setZone]=useState("전체 권역");
  const {items}=useDirectory();
  const rows=regionStats(db).filter(r=>zone==="전체 권역"||r.zone===zone).map(r=>
    [r.zone,r.name,r.available+"개",r.consumption+"개",r.demand+"개",r.level,r.stale?"갱신 지연 포함":"정상"]);
  return <><div className="demo-subhead"><h2>권역별 수요 대비 가용 재고</h2><label>권역<select value={zone} onChange={e=>setZone(e.target.value)}>{["전체 권역",...zones].map(v=><option key={v}>{v}</option>)}</select></label></div>
    <GridTable caption="지역별 수급 현황" heads={["권역","의약품","제공 가능","최근 24시간 사용","예상 수요","판정","조회 자료"]} rows={rows}/>
    <p className="screen-note">예상 수요는 권역별 기준 소비량과 최근 24시간 사용량의 합에 설정한 수요 배율을 적용합니다.</p>
    <h3>부족 상태 변경</h3><GridTable caption="권역 경고 기록" heads={["시각","권역","의약품","변경"]} rows={(db.alerts??[]).filter(r=>zone==="전체 권역"||r.zone===zone).map(r=>[new Date(r.at).toLocaleString("ko-KR"),r.zone,items[r.item],r.before+" → "+r.after])} empty="기록된 경고 상태 변경이 없습니다."/></>;
}

const policyTabs=[["","기관 예외"],["defaults","기본 비축량"],["thresholds","지역 경고 기준"],["history","정책 이력"]];
export function Policy({db,org,id,item,write,update}) {
  const {sites,items}=useDirectory();
  const tab=policyTabs.some(([key])=>key===id)?id:"";
  const [edit,setEdit]=useState(null), [message,setMessage]=useState("");
  async function save(e) {
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.currentTarget));
    if(tab==="thresholds" && +data.danger>=+data.warn){setMessage("위험 기준은 경고 기준보다 작아야 합니다.");return;}
    await update(d=>{
      if(tab==="thresholds"){
        d.limitHistory??=[];d.limitHistory.unshift({at:Date.now(),scope:edit,reason:data.reason,previous:d.regionLimits?.[edit]??initialLimits,next:{warn:+data.warn,danger:+data.danger,mult:+data.mult}});
        d.regionLimits??={};d.regionLimits[edit]={warn:+data.warn,danger:+data.danger,mult:+data.mult};
      }
      else {
        const at=data.at?+new Date(data.at):Date.now();
        const before=effectiveFloor(d,"*",edit,at);
        d.rules??=[];d.rules.push({site:"*",item:edit,qty:+data.qty,at,approver:data.approver,reason:data.reason});
        d.policyLog??=[];d.policyLog.unshift({at:Date.now(),effectiveAt:at,approver:data.approver,item:edit,before,after:+data.qty,reason:data.reason});
      }
    });
    setEdit(null);setMessage(data.at&&+new Date(data.at)>Date.now()?"지정한 시각에 적용하도록 예약했습니다.":"설정을 적용했습니다.");
  }
  const logs=[...(db.policyLog??[]).map(r=>({...r,site:"전체 기관"})),...(db.adminHistory??[]).filter(r=>r.kind==="floor").map(r=>({...r,site:sites[r.site].name}))].sort((a,b)=>b.at-a.at);
  return <><PageTabs {...{org}} page="floor" tabs={policyTabs} current={tab}/>
    {!tab?<AdminInventory {...{db,org,write}} item={item??0} page="floor"/>:
    tab==="history"?<GridTable caption="정책 적용 이력" heads={["적용 대상","의약품","비축량","적용 시작","승인자","사유"]} rows={logs.map(r=>[r.site,items[r.item],r.before+" → "+(r.inherit?"기본값 상속":r.after+"개"),new Date(r.effectiveAt??r.at).toLocaleString("ko-KR"),r.approver??"운영관리자",r.reason])}/>:
    tab==="defaults"?<GridTable caption="기본 비축량" heads={["적용 대상","의약품","최소 비축량","관리"]} rows={items.map((name,i)=>["전체 기관",name,(effectiveFloor(db,"*",i))+"개",<button onClick={()=>{setEdit(i);setMessage("");}}>정책 조정</button>])}/>:
    <GridTable caption="지역 경고 기준" heads={["권역","경고 미만","위험 미만","수요 배율","관리"]} rows={zones.map(name=>{const t=db.regionLimits?.[name]??initialLimits;return [name,t.warn+"%",t.danger+"%",t.mult+"배",<button onClick={()=>{setEdit(name);setMessage("");}}>기준 수정</button>];})}/>}
    {tab==="thresholds"&&<details><summary>경고 기준 변경 이력</summary><GridTable caption="경고 기준 변경 이력" heads={["일시","권역","경고 (%)","위험 (%)","수요 배율","사유"]} rows={(db.limitHistory??[]).map(h=>[new Date(h.at).toLocaleString("ko-KR"),h.scope,h.previous.warn+" → "+h.next.warn,h.previous.danger+" → "+h.next.danger,h.previous.mult+" → "+h.next.mult,h.reason])}/></details>}
    {edit!==null && <form className="demo-form" key={edit} onSubmit={save}><h2>{tab==="defaults"?items[edit]:edit}</h2><div className="receipt-fields">
    {tab==="defaults"?<Field label="새 기본 비축량" name="qty" type="number" min="0" required value={effectiveFloor(db,"*",edit)}/>:
      [["warn","경고 기준 (%)"],["danger","위험 기준 (%)"],["mult","수요 배율"]].map(([key,label])=><Field key={key} name={key} label={label} type="number" min={key==="mult"?0.1:1} step={key==="mult"?0.1:1} required value={(db.regionLimits?.[edit]??initialLimits)[key]}/>)}
      {tab==="defaults"&&<><Field label="적용 시작 시각 (비우면 즉시)" name="at" type="datetime-local"/><Field label="승인자" name="approver" value="운영관리자" required/></>}
      <Field label="변경 사유" name="reason" required/></div><div className="actions"><button className="primary">설정 적용</button><button type="button" onClick={()=>setEdit(null)}>닫기</button></div></form>}
    {message&&<p role="status">{message}</p>}</>;
}


export function Reconcile({org,issues,db,update}) {
  const {sites,items}=useDirectory();
  const [selected,setSelected]=useState(null);
  const report=reconciledLots(db).map(row=>{
    const {lot,current,ledger}=row;
    const example=issues && lot.site==="A" && lot.code==="A-010" && !lot.damaged;
    const counted=example?Math.max(0,current.qty-2):current.qty;
    const difference=counted-ledger.qty;
    const problems=[];
    if(difference)problems.push(Math.abs(difference)+"개 "+(difference<0?"부족":"초과"));
    if(current.held!==ledger.held)problems.push("예약 장부 불일치");
    if(current.held>counted)problems.push("실재고 초과 예약");
    return {...row,counted,problems};
  });
  const failures=report.filter(r=>r.problems.length);
  const checks=(db.checks??[]).filter(c=>c.example===issues);
  const trail=report.find(r=>r.key===selected);
  function save(){
    return update(d=>{
      d.checks??=[];
      d.checks.unshift({at:Date.now(),example:issues,count:report.length,findings:failures.map(r=>r.lot.code+" · "+r.problems.join(", "))});
    });
  }
  return <><PageTabs org={org} page="reconcile" current={issues?"issues":""} tabs={[["","현재 재고 점검"],["issues","불일치 사례"]]}/>
    <div className="demo-subhead"><h2>로트별 수량 대조</h2><span>{report.length}개 로트 중 불일치 {failures.length}건</span><button onClick={save}>점검 결과 기록</button></div>
    {issues&&<p className="confirmation">실사 수량에 2개 차이를 둔 점검 예시입니다.</p>}
    <GridTable caption="재고 점검 결과" heads={["기관 / 로트","의약품","실사 수량","장부 수량","예약 / 장부","판정","근거"]} rows={report.map(r=>[
      sites[r.lot.site].name+" / "+r.lot.code,items[r.lot.item],r.counted+"개",r.ledger.qty+"개",r.current.held+" / "+r.ledger.held,
      r.problems.join(" · ")||"일치",<button onClick={()=>setSelected(r.key)}>이동 내역</button>
    ])}/>
    {trail&&<section className="ledger"><h2>{trail.lot.code} 이동 내역</h2><MovementTable entries={(db.movements??[]).filter(m=>m.key===selected)}/></section>}
    <h3>점검 이력</h3><GridTable caption="점검 기록" heads={["점검 시각","대상 로트","결과"]} rows={checks.map(c=>[new Date(c.at).toLocaleString("ko-KR"),c.count+"개",c.findings.join(" / ")||"전체 일치"])}/></>;
}
