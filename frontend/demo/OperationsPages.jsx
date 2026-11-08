import React,{useMemo,useState} from "react";
import {PageTabs,GridTable,Field} from "./PageParts";
import {scenarioDefaults,simulate,reservationTrial} from "./scenario";
import runs from "./load-runs.json";
import {labels,regionStats,reconciledLots} from "./model";

const opsTabs=[["","업무 현황"],["load","부하 측정"],["recovery","장애·복구"],["sources","자료 출처"]];
const labTabs=[["","수요 시나리오"],["compare","배분 정책 비교"],["race","예약 경합"],["events","수급 이벤트"]];
const fields=[
 ["seed","난수 시드",0,2147483647],["sites","기관 수",2,30],["meds","의약품 수",1,20],
 ["initial","기초 재고 (개)",1,2000],["life","최대 잔여 유효기간 (일)",1,365],["usage","하루 사용량 (개)",1,100],
 ["mult","수요 배율",1,10],["count","요청 건수",1,3000]
];
function Stats({rows}) {return <dl className="metric-strip">{rows.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>;}
const num=(n,unit)=>n==null?"미수집":n.toLocaleString("ko-KR",{maximumFractionDigits:2})+unit;
export function Operations({db,org,id=""}) {
 const [file,setFile]=useState(runs[0].file), [stage,setStage]=useState(0);
 const [fault,setFault]=useState("Redis 캐시");
 const run=runs.find(v=>v.file===file), active=db.requests.filter(r=>["held","accepted","shipped"].includes(r.state)).length;
 const cacheFault=fault==="Redis 캐시";
 const recovery=["정상",cacheFault?"캐시 응답 지연":"소비 중단","복구 완료"];
 return <><PageTabs org={org} page="ops" tabs={opsTabs} current={id}/>
 {id==="load"?<><div className="demo-subhead"><h2>부하 측정 결과</h2><label>측정 파일<select value={file} onChange={e=>setFile(e.target.value)}>{runs.map(r=><option key={r.file}>{r.file}</option>)}</select></label></div>
 <p className="screen-note">저장소에 보관된 k6 측정값입니다. 파일을 선택하면 해당 실행 결과를 볼 수 있습니다.</p>
 <Stats rows={[["전체 요청",num(run.count,"건")],["초당 요청",num(run.rate,"건/s")],["오류율",num(run.error==null?null:run.error*100,"%")]]}/>
 <p className="screen-note">시험 시작·종료 시각, 시나리오 버전, Redis 적중률과 DB 부하는 이 측정 파일에 없습니다.</p>
 <GridTable caption="응답 지연" heads={["응답시간 분포","측정값"]} rows={[["평균",num(run.avg," ms")],["95백분위",num(run.p95," ms")],["99백분위",num(run.p99," ms")]]}/></>:
 id==="recovery"?<><h2>장애·복구 시연</h2><p className="screen-note">예시 원장 78개와 이벤트 5건으로 장애 전후의 조회 결과를 확인합니다.</p><label className="demo-select">장애 대상<select value={fault} onChange={e=>{setFault(e.target.value);setStage(0);}}><option>Redis 캐시</option><option>Kafka 소비자</option></select></label>
 <Stats rows={[["현재 상태",recovery[stage]],["재고 조회",stage===1&&cacheFault?"원장 조회":"캐시 조회"],["실시간 측정","미수집"]]}/>
 <GridTable caption="인프라 수집 상태" heads={["수집 대상","상태"]} rows={["DB 연결 · 잠금 대기","Redis 적중률 · 캐시 재구축","Kafka 소비 지연 · 처리율","Outbox · DLQ · 재시도"].map(v=>[v,"미수집"])}/>
 <div className="actions"><button disabled={stage===1} onClick={()=>setStage(1)}>지연 상황 재현</button><button disabled={stage!==1} className="primary" onClick={()=>setStage(2)}>복구 확인</button></div>
 <GridTable caption="모의 복구 전후" heads={["단계","원장 수량","조회 수량","대기 이벤트","격리 이벤트"]} rows={[["정상",78,78,0,0],...(stage>=1?[["장애 중",78,cacheFault?"조회 제한":"90 · 갱신 지연",5,0]]:[]),...(stage===2?[["재처리 후",78,78,0,1]]:[])]}/>
 <GridTable caption="복구 절차" heads={["순서","상황","처리 결과"]} rows={[["01","정상 운영","재고 캐시 조회"],...(stage>=1?[["02",cacheFault?"캐시 지연 감지":"소비자 중단",cacheFault?"원장으로 대체":"이벤트 대기 · 조회 자료 지연"]]:[]),...(stage===2?[["03","조회 모델 재구축","원장 기준 캐시 재개"],["04","이벤트 재처리","중복·기존 버전 건너뜀"],["05","실패 이벤트","1건 격리 · 원인 점검 대기"]]:[])]}/></>:
 id==="sources"?<><h2>자료 출처</h2><GridTable caption="자료 구분" heads={["항목","출처","화면에서의 쓰임"]} rows={[["기관·의약품·로트","합성 자료","재고, 요청, 권역별 수급"],["지도","가상 권역도","기관 간 상대 위치"],["성능 지표","저장소의 k6 측정 파일","선택한 실행의 응답시간·처리량"],["수요·이벤트","시드 기반 모의 실험","배분 정책 비교 및 중복 확인"],["공개 집계자료","과거 사용량·감염병 통계 (연계 예정)","수요 기준선"],["공공 의약품·기관 자료","미연결","실제 기관 또는 실제 재고로 사용하지 않음"]]}/></>:
 <><h2>업무 운영 지표</h2><Stats rows={[["전체 요청",db.requests.length+"건"],["처리 중",active+"건"],["수령 완료",db.requests.filter(r=>r.state==="received").length+"건"]]}/>
 <GridTable caption="예약 및 수급 지표" heads={["업무 지표","집계"]} rows={[
   ["임시 예약 성공",db.requests.filter(r=>r.alloc).length+"건"],["예약 실패",(db.holdFailures??0)+"건"],
   ["예약 만료",db.requests.filter(r=>r.state==="expired").length+"건"],["초과 예약 로트",reconciledLots(db).filter(r=>r.current.held>r.current.qty).length+"개"],
   ["부족 권역",new Set(regionStats(db).filter(r=>["경고","위험"].includes(r.level)).map(r=>r.zone)).size+"곳"],["Outbox 대기","미수집"]
 ]}/>
 <GridTable caption="처리 단계별 현황" heads={["처리 단계","현재 건수"]} rows={Object.entries(labels).map(([k,v])=>[v,db.requests.filter(r=>r.state===k).length+"건"])}/></>}</>;
}

export const Lab = React.memo(function Lab({org,id=""}){
 const [config,setConfig]=useState(scenarioDefaults), [race,setRace]=useState({qty:100,requests:1000});
 const trial=useMemo(()=>reservationTrial(race.qty,race.requests),[race]);
 const [importMessage,setImportMessage]=useState("");
 const [eventType,setEventType]=useState("전체");
 const result=useMemo(()=>simulate(config),[config]);
 async function replay(event){
   const file=event.target.files[0];
   if(!file)return;
   try{
     const saved=JSON.parse(await file.text()).config;
     const next={};
     for(const [name,,min,max] of fields){
       const value=saved?.[name];
       if(!Number.isSafeInteger(value)||value<min||value>max)throw Error();
       next[name]=value;
     }
     setConfig(next);setImportMessage("");location.hash="#"+org+"/lab/compare";
   }catch{setImportMessage("이 화면에서 저장한 시나리오 JSON 파일과 입력 범위를 확인해 주세요.");}
 }
 function submit(e){e.preventDefault();setConfig(Object.fromEntries([...new FormData(e.currentTarget)].map(([k,v])=>[k,Number(v)])));location.hash="#"+org+"/lab/compare";}
 const note=<p className="screen-note">시드 {config.seed} · 기관 {config.sites}곳 · 의약품 {config.meds}종 · 요청 {config.count}건 · 모의 기간 7일</p>;
 return <><PageTabs org={org} page="lab" tabs={labTabs} current={id}/>
 {id==="compare"?<><h2>배분 정책 비교</h2>{note}<GridTable caption="정책 비교 결과" heads={["정책","배정 성공","평균 거리 (km)","상위 95% 거리 (km)","비축선 도달","최다 배정 기관 비중","폐기 수량"]} rows={result.rows}/><p className="screen-note">{new Date(result.startedAt).toLocaleString("ko-KR")} 시작 · {new Date(result.at).toLocaleString("ko-KR")} 종료 · {result.version}</p><a download={"scenario-"+config.seed+".json"} href={"data:application/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(result,null,2))}>시나리오와 결과 저장 (JSON)</a></>:
 id==="events"?<><h2>합성 수급 이벤트</h2>{note}<p className="screen-note">SYNTHETIC_REALTIME · 시뮬레이터 생성 자료</p><label className="demo-select">이벤트 유형<select value={eventType} onChange={e=>setEventType(e.target.value)}>{["전체","입고","사용","폐기","요청"].map(t=><option key={t}>{t}</option>)}</select></label><GridTable caption="수급 이벤트 기록" heads={["이벤트 ID","발생일","반영일","기관 / 품목","유형","수량","처리 결과"]} rows={result.events.filter(e=>eventType==="전체"||eventType===e.kind).map(e=>[e.id,(e.day+1)+"일차",(e.day+e.delay+1)+"일차",(e.s+1)+"번 / "+(e.m+1)+"번",e.kind,e.qty===null?"만료 시 잔량":e.qty+"개",e.repeated?"중복 제외":e.delay?"지연 반영":"정상 반영"])}/></>:
 id==="race"?<><h2>예약 경합 시연</h2><p className="screen-note">1개 단위의 예약을 브라우저에서 순서대로 처리하는 모의 실험입니다. 남은 수량만큼만 예약할 수 있습니다.</p>
 <form className="demo-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setRace({qty:+f.get("qty"),requests:+f.get("requests")});}}><div className="receipt-fields"><Field label="가용 수량" name="qty" type="number" value={race.qty} min="0" max="100000" required/><Field label="동시 요청 수" name="requests" type="number" value={race.requests} min="1" max="100000" required/></div><button className="primary">결과 보기</button></form>
 <Stats rows={[["예약 성공",trial.success+"건"],["재고 부족 거절",trial.rejected+"건"],["남은 수량",trial.remaining+"개"]]}/><GridTable caption="예약 재시도 및 상태 경합" heads={["시험 조건","모의 결과"]} rows={[[ "동일 요청 키 재전송", "추가 차감 "+trial.replay+"개"],...trial.transitions,["DB 잠금 대기 · 교착 재시도","미수집"]]}/></>:
 <form className="demo-form" onSubmit={submit}><h2>합성 수요 시나리오</h2><p className="screen-note">같은 시드와 요청 순서로 네 배분 정책을 비교합니다.</p><div className="receipt-fields">{fields.map(([name,label,min,max])=><Field key={name} label={label} value={config[name]} {...{name,min,max}} type="number" required/>)}</div><button className="primary">실행하고 정책 비교</button><div className="ledger"><label>저장한 시나리오 재실행<input type="file" accept=".json,application/json" onChange={replay}/></label>{importMessage&&<p role="alert">{importMessage}</p>}</div></form>}</>;
});
