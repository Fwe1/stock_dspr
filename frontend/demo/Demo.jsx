import {DirectoryContext} from "./DirectoryContext";
import {directory} from "./directory";
import React,{useEffect,useRef,useState} from "react";
import {updateAlerts,labels,seed,readDemo,changeDemo,storageKey,apply,applyAdminChange,refreshExpiry} from "./model";
import {Stock,NewRequest,Candidates,RequestDetail} from "./TransferPages";
import {AdminInventory,AdminHistory} from "./AdminInventory";
import {Catalog,Region,Policy,Reconcile} from "./ManagementPages";
import {Lab,Operations} from "./OperationsPages";
import {ScreenIndex} from "./PageParts";
import {screens,sampleState} from "./screens";
import "./demo.css";

const views={stock:"기관 재고",new:"전배 요청",sent:"보낸 요청",inbox:"받은 요청",transit:"이송 기록",candidates:"인근 전배처",all:"전체 요청",open:"미배정 요청",adjust:"재고 조정",floor:"최소 비축량 설정",audit:"변경 이력",screens:"전체 화면",facilities:"기관 관리",medicines:"의약품 관리",region:"지역 수급",reconcile:"재고 정합성 점검",ops:"운영 지표",lab:"수요 모의실험",reader:"지역 수급 조회"};
const staff=["stock","new","sent","inbox","transit"], manager=["all","open","adjust","floor","audit","facilities","medicines","region","reconcile","ops","lab"];
function route() {
 const [site,page,id]=location.hash.slice(1).split("/");
 return {site,page:Object.hasOwn(views,page)?page:"screens",id};
}
function url(org,page,id){return "#"+[org,page,id].filter(Boolean).join("/");}
export default function Demo() {
 const [{site,page,id},setPos]=useState(route);
 const sample=screens[Number(new URLSearchParams(location.search).get("screen"))-1];
 const admin=manager.includes(page), reader=page==="reader";
 const [db,setDb]=useState(()=>{try{return sample?sampleState(sample[0]):readDemo()}catch{return seed();}});
 const registry=directory(db), {sites,items}=registry;
 const org=Object.hasOwn(sites,site)?site:"H";
 const item=id!==undefined && /^\d+$/.test(id) && Object.hasOwn(items,id)?Number(id):null;
 const latest=useRef(db), busy=useRef(false), [error,setError]=useState("");
 useEffect(()=>{
   let active=true;
   async function sync(){try{const {db:next}=await changeDemo();if(active){latest.current=next;setDb(next);}}catch{if(active)setError("시연 데이터를 저장할 수 없습니다. 브라우저의 저장 설정을 확인해 주세요.");}}
   const hash=()=>{setPos(route());setError("");window.scrollTo(0,0);};
   const storage=e=>{if(e.key===storageKey)sync();};
   window.addEventListener("hashchange",hash);
   if(!sample){sync();window.addEventListener("storage",storage);}
   const timer=setInterval(sample?()=>{const next=structuredClone(latest.current);refreshExpiry(next);updateAlerts(next);latest.current=next;setDb(next);}:sync,3000);
   return ()=>{active=false;clearInterval(timer);window.removeEventListener("storage",storage);window.removeEventListener("hashchange",hash);};
 },[]);
 const title=page==="new"?"전배 요청 작성":views[page];
 useEffect(()=>{document.title=title+" · Stock Dispenser";},[title]);
 function go(p,n){location.hash=url(org,p,n);}
 async function mutate(edit){
   let next,result;
   if(sample){next=structuredClone(latest.current);refreshExpiry(next);updateAlerts(next);result=edit(next);updateAlerts(next);}
   else {({db:next,result}=await changeDemo(edit));}
   latest.current=next;setDb(next);return result;
 }
 function write(site,medicine,change){return mutate(d=>applyAdminChange(d,site,medicine,change));}
 async function run(action,number,data){
   if(busy.current)return false;busy.current=true;setError("");
   try{return (await mutate(d=>apply(d,org,action,number,data)))??true;}
   catch(e){setError(e.message);if(action==="hold")await mutate(d=>{d.holdFailures=(d.holdFailures??0)+1;});return false;}finally{busy.current=false;}
 }
 const requests=db.requests.filter(r=>admin?page==="all" || r.state==="open":page==="transit"?[r.from,r.to].includes(org)&&["accepted","shipped","received","failed"].includes(r.state):page==="inbox"?r.to===org:r.from===org);
 const selected=id?requests.find(r=>r.id===id):requests[0];
 const indexUrl="?demo=1#H/screens";
 return <DirectoryContext.Provider value={registry}><div className="demo"><header><div className="inner"><strong>✚ Stock Dispenser</strong><div className="demo-controls"><a href={indexUrl}>전체 화면</a><small>시연 시점</small>
 <select aria-label="시연 역할" value={admin?"admin":reader?"reader":"staff"} onChange={e=>go(({admin:"all",reader:"reader",staff:"sent"})[e.target.value])}><option value="staff">기관 담당자</option><option value="admin">운영관리자</option><option value="reader">조회 전용 분석자</option></select>
 {!admin&&!reader && <select aria-label="현재 기관" value={org} onChange={e=>{const s=e.target.value;const keep=!["stock","new"].includes(page)&&selected&&[selected.from,selected.to].includes(s);location.hash=url(s,keep?(selected.from===s?"sent":"inbox"):(["stock","new"].includes(page)?page:"inbox"),keep?selected.id:null);}}>{Object.entries(sites).map(([k,s])=><option key={k} value={k}>{s.name}</option>)}</select>}</div></div></header>
 <nav className="demo-nav" aria-label="업무 메뉴">{(admin?manager:reader?["reader"]:staff).map(v=><a key={v} aria-current={(v===page||(page==="candidates"&&v==="sent"))?"page":undefined} href={url(org,v,["adjust","floor"].includes(v)&&item!=null?String(item):null)}>{views[v]}</a>)}</nav>
 <main className="inner"><div className="demo-title"><div><small>{page==="screens"?"업무 화면 안내":admin?"운영관리자":reader?"조회 전용 분석자":sites[org].name+" 약제부"}</small><h1>{title}</h1></div><span>{page==="ops"&&id==="load"?"저장소 측정 기록 · k6":"모의 운영 · 합성 데이터"}</span></div>
 {error && <p className="form-error" role="alert">{error}</p>}
 {page==="screens"?<ScreenIndex/>:page==="reader"||page==="region"?<Region db={db}/>:page==="reconcile"?<Reconcile key={id} db={db} update={mutate} org={org} issues={id==="issues"}/>:page==="lab"?<Lab {...{org,id}}/>:page==="ops"?<Operations {...{db,org,id}}/>:["facilities","medicines"].includes(page)?<Catalog key={page} {...{page,db}} update={mutate}/>:
 page==="floor"?<Policy key={org+page+id} {...{db,org,id,item,write}} update={mutate}/>:page==="adjust"?<AdminInventory key={org+page+item} {...{db,org,page,write}} item={item??0}/>:
 page==="audit"?<AdminHistory key={org+page+item} {...{db,org,item}}/>:
 page==="new"?<NewRequest key={org} {...{org,run,go}}/>:page==="stock"?<Stock key={org+id} write={write} initialItem={item??0} showIntake={sample?.[0]==="로트 입고"} {...{db,org,run,go}}/>:page==="candidates"&&selected?.state==="open"?<Candidates key={selected.id} {...{db,run,go}} r={selected} scored={sample?.[0]==="재검색·배분 점수"}/>:<div className="demo-work">
 <aside aria-label="요청 목록">{!requests.length&&<p className="notice">표시할 요청이 없습니다.</p>}{requests.map(r=><a key={r.id} className={r.id===selected?.id?"chosen":""} href={url(org,page==="candidates"?"sent":page,r.id)}><small>{r.id} · {labels[r.state]}</small><b>{items[r.item]} {r.qty}개</b><span>{sites[r.from].name} → {sites[r.to]?.name??"미배정"}</span></a>)}</aside>
 {selected?<RequestDetail key={org+selected.id+page} r={selected} {...{org,admin,run,go}} initialMode={sample?.[0]==="수령 입력"?"receive":""}/>:<p className="notice">{id?"이 목록에서 해당 요청을 찾을 수 없습니다.":"요청이 들어오면 이곳에서 처리할 수 있습니다."}</p>}</div>}
 <footer>Stock Dispenser · 가상 기관 및 합성 재고 {sample&&<a href={indexUrl}>전체 화면으로</a>}</footer></main></div></DirectoryContext.Provider>;
}
