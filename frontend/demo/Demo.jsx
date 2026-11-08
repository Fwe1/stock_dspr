import React,{useEffect,useRef,useState} from "react";
import {sites,items,labels,seed,readDemo,changeDemo,storageKey,apply,applyAdminChange} from "./model";
import {Stock,NewRequest,Candidates,RequestDetail} from "./TransferPages";
import {AdminInventory, AdminHistory} from "./AdminInventory";
import "./demo.css";

const views={stock:"기관 재고",new:"전배 요청",sent:"보낸 요청",inbox:"받은 요청",transit:"이송 기록",candidates:"인근 전배처",all:"전체 요청",open:"미배정 요청",adjust:"재고 조정",floor:"최소 비축량 설정",audit:"변경 이력"};
const staff=["stock","new","sent","inbox","transit"], manager=["all","open","adjust","floor","audit"];
function route() {
  const [site,page,id]=location.hash.slice(1).split("/");
  const org=Object.hasOwn(sites,site)?site:"H";
  return {org,page:Object.hasOwn(views,page)?page:"sent",id};
}
function url(org,page,id) {return "#"+[org,page,id].filter(Boolean).join("/");}
export default function Demo() {
  const [pos,setPos]=useState(route);
  const {org,page,id}=pos, admin=manager.includes(page);
  const item = id !== undefined && Object.hasOwn(items, id) && /^\d+$/.test(id) ? Number(id) : null;
  const [db,setDb]=useState(()=>{try{return readDemo()}catch{return seed()}});
  const [error,setError]=useState("");
  const busy=useRef(false);
  useEffect(()=>{
    let active=true;
    const sync=async()=>{
      try {const {db:next}=await changeDemo();if(active)setDb(next);}
      catch {if(active)setError("시연 데이터를 저장할 수 없습니다. 브라우저의 사이트 저장 설정을 확인해 주세요.");}
    };
    const hash=()=>{setPos(route());setError("");};
    const storage=e=>{if(e.key===storageKey)sync();};
    sync();const timer=setInterval(sync,3000);
    window.addEventListener("storage",storage);window.addEventListener("hashchange",hash);
    return ()=>{active=false;clearInterval(timer);window.removeEventListener("storage",storage);window.removeEventListener("hashchange",hash);};
  },[]);
  function go(dest,number) {location.hash=url(org,dest,number);}
  async function write(site, medicine, change) {
    const { db: next, result } = await changeDemo(d => applyAdminChange(d, site, medicine, change));
    setDb(next);
    return result;
  }
  async function run(action,number,data) {
    if(busy.current)return false;
    busy.current=true;setError("");
    try {const {db:next,result}=await changeDemo(d=>apply(d,org,action,number,data));setDb(next);return result??true;}
    catch(e){setError(e.message);return false;}
    finally{busy.current=false;}
  }
  const requests=db.requests.filter(r=>{
    if(admin)return page==="all" || r.state==="open";
    if(page==="transit")return [r.from,r.to].includes(org) && ["accepted","shipped","received","failed"].includes(r.state);
    return page==="inbox"?r.to===org:r.from===org;
  });
  const selected=id?requests.find(r=>r.id===id):requests[0];
  let title=views[page];
  if(page==="new")title="전배 요청 작성";
  return <div className="demo"><header><div className="inner"><strong>✚ Stock Dispenser</strong><div className="demo-controls"><small>시연 시점</small>
    <select aria-label="시연 역할" value={admin?"admin":"staff"} onChange={e=>go(e.target.value==="admin"?"all":"sent")}><option value="staff">기관 담당자</option><option value="admin">운영관리자</option></select>
    {!admin && <select aria-label="현재 기관" value={org} onChange={e=>{const nextOrg=e.target.value;const keep=page!=="stock" && page!=="new" && selected && [selected.from,selected.to].includes(nextOrg);location.hash=url(nextOrg, keep?(selected.from===nextOrg?"sent":"inbox"):(["stock","new"].includes(page)?page:"inbox"),keep?selected.id:null);}}>{Object.entries(sites).map(([k,s])=><option key={k} value={k}>{s.name}</option>)}</select>}</div></div></header>
    <nav className="demo-nav" aria-label="업무 메뉴">{(admin?manager:staff).map(v=><a key={v} aria-current={(v===page || (page==="candidates" && v==="sent"))?"page":undefined} href={url(org,v,["adjust","floor"].includes(v) && item != null ? String(item) : null)}>{views[v]}</a>)}</nav>
    <main className="inner"><div className="demo-title"><div><small>{admin?"운영관리자":sites[org].name+" 약제부"}</small><h1>{title}</h1></div><span>모의 운영 · 합성 데이터</span></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {page==="adjust" || page==="floor" ? <AdminInventory key={org+page+item} {...{db,org,page,write}} item={item ?? 0}/> :
     page==="audit" ? <AdminHistory key={org+page+item} {...{db,org,item}}/> :
     page==="new"?<NewRequest key={org} {...{org,run,go}}/>:page==="stock"?<Stock key={org+id} initialItem={item ?? 0} {...{db,org,run,go}}/>:page==="candidates" && selected?.state==="open"?<Candidates key={selected.id} {...{db,run,go}} r={selected}/>:<div className="demo-work">
      <aside aria-label="요청 목록">{!requests.length && <p className="notice">표시할 요청이 없습니다.</p>}{requests.map(r=><a key={r.id} className={r.id===selected?.id?"chosen":""} href={url(org,page==="candidates"?"sent":page,r.id)}><small>{r.id} · {labels[r.state]}</small><b>{items[r.item]} {r.qty}개</b><span>{sites[r.from].name} → {sites[r.to]?.name??"미배정"}</span></a>)}</aside>
      {selected?<RequestDetail key={org+selected.id+page} r={selected} {...{org,admin,run,go}}/>:<p className="notice">{id?"이 목록에서 해당 요청을 찾을 수 없습니다.":"요청이 들어오면 이곳에서 처리할 수 있습니다."}</p>}</div>}
    <footer>Stock Dispenser · 가상 기관 및 합성 재고 <a href={location.pathname+"?mode=live"}>서버 연결 화면</a></footer>
    </main></div>;
}
