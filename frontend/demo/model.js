import {directory,sites,items,freshness,zones} from "./directory.js";
import {weighted} from "./scenario.js";
export {sites,items} from "./directory.js";
export const labels = { open: "미배정", held: "응답 대기", accepted: "출고 대기", shipped: "이송 중", received: "수령 완료", cancelled: "취소", rejected: "거절", expired: "예약 만료", failed: "이송 실패" };
export const storageKey = "stock-dispenser:transfer-demo:1";


export function seed() {
  const expiry = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const lots = Object.keys(sites).flatMap((site, index) => [0, 1].map(item => ({
    site, item, code: site + "-01" + item, expiry, qty: (item === 0 ? [18, 45, 25, 80] : [6, 35, 15, 18])[index]
  })));
  const created = Date.now();
  const sample = { id: "TR-001", from: "H", item: 0, qty: 20, due: created + 86400000,
    dest: "한빛의료원 본관 약제실", reason: "병동 투약분 보충", range: 5, priority: "일반", state: "open",
    history: [{ time: created, text: "전배 요청 등록" }] };
  return { lots, requests: [sample], next: 2, startedAt:created };
}

export function readDemo() {
  const value = localStorage.getItem(storageKey);
  return value ? JSON.parse(value) : seed();
}

function ensure(ok, message) { if (!ok) throw new Error(message); }
export function reserved(db, lot) {
  return db.requests.filter(r => r.to === lot.site && r.item === lot.item && ["held","accepted"].includes(r.state))
    .flatMap(r => r.alloc).filter(a => a.code === lot.code && a.expiry === lot.expiry).reduce((sum,a) => sum+a.qty,0);
}
function usable(db, site, item, date) {
  return db.lots.filter(l => l.site === site && l.item === item && l.expiry >= date && !l.damaged)
    .sort((a,b) => a.expiry.localeCompare(b.expiry) || a.code.localeCompare(b.code));
}
function availableAfterFloor(free, floor, status) {
  return status === "운영 중지" ? 0 : Math.max(0, free - floor);
}
export function balance(db, site, item, date = new Date().toISOString().slice(0,10)) {
  const free = usable(db, site, item, date).reduce((s,l) => s + l.qty - reserved(db,l),0);
  const floor = effectiveFloor(db,site,item);
  return { floor, available: availableAfterFloor(free, floor, directory(db).sites[site]?.status) };
}
export function candidates(db, r) {
  const {sites}=directory(db);
  const from = sites[r.from], neededDay = new Date(r.due).toISOString().slice(0,10);
  return Object.entries(sites).filter(([id]) => id !== r.from).map(([id,site]) => {
    const km = Math.hypot(site.x - from.x,site.y - from.y) / 100;
    const {available,floor} = balance(db,id,r.item,neededDay);
    const timing=freshness(db,site);
    const eligible=usable(db,id,r.item,neededDay).filter(l=>l.qty>reserved(db,l));
    const expiry=eligible[0]?.expiry;
    let reason = "";
    if (Date.now() >= r.due) reason = "필요 시각 경과";
    else if (!site.located || !from.located) reason = "위치 미등록";
    else if (site.status==="운영 중지") reason="운영 중지";
    else if (site.shipping==="불가") reason="이송 불가";
    else if (km > r.range) reason = "검색 반경 밖";
    else if (timing.stale) reason = "재고 갱신 지연";
    else if (available < r.qty) reason = (r.qty - available) + "개 부족";
    const load=db.requests.filter(q=>q.to===id&&["held","accepted","shipped"].includes(q.state)).length;
    const score=weighted(km/r.range,r.qty/Math.max(available,1),expiry?(Date.parse(expiry)-r.due)/86400000/365:1,load/5);
    if(reason.endsWith("개 부족")){
      const unexpired=balance(db,id,r.item).available;
      if(unexpired>=r.qty) reason+=" · 필요 시각 이전 유효기간 만료";
      else if(available+floor>=r.qty) reason+=" · 최소 비축량 보호";
    }
    return { id, km, available, reason, expiry, score, ...timing };
  }).sort((a,b) => Number(!!a.reason)-Number(!!b.reason) || a.km-b.km);
}
function credit(db, site, item, code, expiry, qty, damaged = false) {
  if (!qty) return;
  const existing = db.lots.find(l => l.site === site && l.item === item && l.code === code && l.expiry === expiry && !!l.damaged === damaged);
  if (existing) existing.qty += qty;
  else db.lots.push({site,item,code,expiry,qty,damaged});
}
function applyAction(db, actor, action, id, data) {
  const {sites,items}=directory(db);
  ensure(sites[actor], "기관을 확인해 주세요.");
  if (action === "new") {
    ensure(sites[actor].status!=="운영 중지","운영 중지 기관은 요청을 등록할 수 없습니다.");
    ensure(Number.isSafeInteger(data.qty) && data.qty > 0 && data.due > Date.now() && items[data.item] && data.reason.trim() && data.dest.trim(), "요청 내용을 확인해 주세요.");
    const number = "TR-" + String(db.next++).padStart(3,"0");
    db.requests.unshift({...data,id:number,from:actor,state:"open",history:[{time:Date.now(),text:"전배 요청 등록"}]});
    return number;
  }
  if (action === "intake") {
    ensure(data.code && data.expiry >= new Date().toISOString().slice(0,10) && Number.isSafeInteger(data.qty) && data.qty > 0, "로트 번호, 유효기간과 수량을 확인해 주세요.");
    credit(db,actor,data.item,data.code,data.expiry,data.qty);
    return;
  }
  const r = db.requests.find(row => row.id === id);
  ensure(r, "요청을 찾을 수 없습니다.");
  const sender = r.from === actor, provider = r.to === actor;
  let text;
  switch (action) {
    case "search":
      ensure(sender && r.state === "open" && [1,3,5,10].includes(data.range), "미배정 요청의 검색 조건을 확인해 주세요.");
      r.range = data.range;
      text = "후보 재검색 · 반경 " + r.range + " km"; break;
    case "hold": {
      ensure(sender && r.state === "open", "이미 처리된 요청입니다.");
      const c = candidates(db,r).find(c => c.id === data.site);
      ensure(c && !c.reason, c?.reason || "전량 제공 가능한 기관을 선택해 주세요.");
      let missing = r.qty;
      const alloc = [];
      for (const lot of usable(db,c.id,r.item,new Date(r.due).toISOString().slice(0,10))) {
        const qty = Math.min(missing, lot.qty - reserved(db,lot));
        if (qty > 0) alloc.push({code:lot.code,expiry:lot.expiry,qty});
        missing -= qty;
        if (!missing) break;
      }
      ensure(!missing,"예약 가능한 수량이 바뀌었습니다.");
      Object.assign(r,{to:c.id,state:"held",alloc,until:Math.min(r.due,Date.now()+600000)});
      r.decision={policy:data.policy??"최근접",version:"alloc-sim-2",score:c.score,weights:[40,30,20,10]};
      text = sites[c.id].name + " · " + r.qty + "개 임시 예약"; break;
    }
    case "accept": case "reject":
      ensure(provider && r.state === "held","응답할 수 있는 예약이 아닙니다.");
      r.state = action === "accept" ? "accepted" : "rejected";
      text = action === "accept" ? "제공기관 수락" : "제공기관 거절 · 예약 해제"; break;
    case "cancel":
      ensure(sender && ["open","held"].includes(r.state),"취소할 수 없는 요청입니다.");
      r.state = "cancelled"; text = "요청기관 취소"; break;
    case "ship":
      ensure(provider && r.state === "accepted","수락한 요청만 출고할 수 있습니다.");
      for (const a of r.alloc) {
        const lot = db.lots.find(l => l.site === actor && l.item === r.item && l.code === a.code && l.expiry === a.expiry && !l.damaged);
        ensure(lot && lot.qty >= a.qty,"출고 수량을 확인해 주세요."); lot.qty -= a.qty;
      }
      r.state = "shipped"; text = r.qty+"개 출고"; break;
    case "receive": {
      ensure(sender && r.state === "shipped","이송 중인 요청만 수령할 수 있습니다.");
      let {good,bad} = data;
      ensure([good,bad].every(n=>Number.isSafeInteger(n) && n>=0) && good+bad>0 && good+bad<=r.qty,"수령 수량은 1개 이상이며 출고 수량을 넘을 수 없습니다.");
      r.receipt = {good,bad,missing:r.qty-good-bad};
      for (const a of r.alloc) {
        const g=Math.min(a.qty,good), b=Math.min(a.qty-g,bad);
        credit(db,actor,r.item,a.code,a.expiry,g); credit(db,actor,r.item,a.code,a.expiry,b,true);
        good-=g; bad-=b;
      }
      r.state="received"; text="수령 완료 · 정상 "+data.good+"개 / 사용 불가 "+data.bad+"개 / 미도착 "+r.receipt.missing+"개"; break;
    }
    case "fail":
      ensure(sender && r.state==="shipped" && data.reason?.trim(),"이송 실패 사유를 입력해 주세요.");
      r.state="failed"; text="이송 실패 · "+data.reason.trim(); break;
    default: throw new Error("처리할 수 없는 작업입니다.");
  }
  r.history.push({time:Date.now(),text});
  return r.id;
}

export const adjustmentNames = { count: "실사 조정", use: "사용", discard: "폐기", floor: "비축량 변경" };

function adminChange(db, site, item, edit) {
  const {sites,items}=directory(db);
  ensure(Object.hasOwn(sites, site) && Number.isInteger(item) && items[item], "기관과 의약품을 확인해 주세요.");
  const { kind, value, expected } = edit;
  const reason = edit.reason.trim();
  ensure(Object.hasOwn(adjustmentNames, kind) && reason.length > 0 && reason.length <= 300, "변경 유형과 사유를 확인해 주세요.");
  ensure(Number.isSafeInteger(value) && value >= 0 && value <= 2147483647, "수량은 0 이상의 정수로 입력해 주세요.");
  const beforeAvailable = balance(db, site, item).available;
  let before, after;
  if (kind === "floor") {
    before = balance(db, site, item).floor;
    after = value;
    ensure(before === expected, "작성 중 비축량이 바뀌었습니다. 다시 선택해 주세요.");
    ensure(before !== after || edit.inherit || edit.effectiveAt>Date.now(), "변경 전과 후의 수량이 같습니다.");
    db.rules??=[];db.rules.push({site,item,qty:edit.inherit?null:after,at:edit.effectiveAt??Date.now(),approver:edit.approver??"운영관리자",reason});
  } else {
    const lot = db.lots.find(l => l.site === site && l.item === item && l.code === edit.code &&
      l.expiry === edit.expiry && !!l.damaged === edit.damaged);
    ensure(lot, "선택한 로트를 다시 확인해 주세요.");
    before = lot.qty;
    after = kind === "count" ? value : before - value;
    const held = lot.damaged ? 0 : reserved(db, lot);
    ensure(kind !== "use" || (!lot.damaged && lot.expiry >= new Date().toISOString().slice(0,10)), "사용 불가 또는 기한 경과 로트는 사용할 수 없습니다.");
    ensure(after >= held, "변경 후 실재고가 예약 수량(" + held + "개)보다 적습니다.");
    ensure(before === expected, "작성 중 실재고가 바뀌었습니다. 다시 선택해 주세요.");
    ensure(before !== after, "변경 전과 후의 수량이 같습니다.");
    lot.qty = after;
  }
  const entry = {
    id: edit.ref??crypto.randomUUID(), at: Date.now(), site, item, kind, before, after, reason,
    code: edit.code, expiry: edit.expiry, damaged: edit.damaged, actor: edit.actor??"운영관리자", approver:edit.approver,effectiveAt:edit.effectiveAt,inherit:edit.inherit,
    beforeAvailable, afterAvailable: balance(db, site, item).available
  };
  db.adminHistory ??= [];
  db.adminHistory.unshift(entry);
  return entry;
}

export async function changeDemo(edit) {
  const update = () => {
    const db=readDemo();
    refreshExpiry(db);
    updateAlerts(db);
    const result=edit?.(db);
    if(edit)updateAlerts(db);
    const json=JSON.stringify(db);
    if (json!==localStorage.getItem(storageKey)) localStorage.setItem(storageKey,json);
    return {db,result};
  };
  return navigator.locks ? navigator.locks.request(storageKey,update) : update();
}

function latestRule(db,site,item,at) {
  return (db.rules??[]).filter(r=>r.site===site && r.item===item && r.at<=at)
    .reduce((latest,r)=>!latest || r.at>=latest.at?r:latest,null);
}
export function effectiveFloor(db,site,item,at=Date.now()) {
  const common=latestRule(db,"*",item,at)?.qty ?? db.defaultFloors?.[item] ?? [10,5][item] ?? 0;
  if(site==="*")return common;
  const local=latestRule(db,site,item,at);
  if(local)return local.qty??common;
  return db.floorOverrides?.[site]?.[item]??common;
}
export const lotKey=l=>JSON.stringify([l.site,l.item,l.code,l.expiry,!!l.damaged]);
// Rebuild for each batch: a reservation can change between two ledger snapshots.
function reservedByLot(db) {
  const totals = new Map();
  for (const request of db.requests) {
    if (request.state !== "held" && request.state !== "accepted") continue;
    for (const allocation of request.alloc) {
      const key = lotKey({site: request.to, item: request.item, code: allocation.code, expiry: allocation.expiry});
      totals.set(key, (totals.get(key) ?? 0) + allocation.qty);
    }
  }
  return totals;
}
function snapshot(db) {
  const reservations = reservedByLot(db);
  const rows = {};
  for (const lot of db.lots) {
    const key = lotKey(lot);
    rows[key] = {qty: lot.qty, held: reservations.get(key) ?? 0};
  }
  return rows;
}
export function reconciledLots(db) {
  const current=snapshot(db),ledger=structuredClone(db.opening??current);
  for(const m of db.movements??[]){
    const row=ledger[m.key]??={qty:0,held:0};
    row.qty+=m.after-m.before;
    row.held+=m.heldAfter-m.heldBefore;
  }
  const keys=new Set([...Object.keys(current),...Object.keys(ledger)]);
  return Array.from(keys,key=>{
    const [site,item,code,expiry,damaged]=JSON.parse(key);
    return {lot:{site,item,code,expiry,damaged},key,current:current[key]??{qty:0,held:0},ledger:ledger[key]??{qty:0,held:0}};
  });
}
function recordMovement(db,meta,edit) {
  const before=snapshot(db);
  db.opening??=before;
  const result=edit();
  const after=snapshot(db);
  for(const l of db.lots){
    const key=lotKey(l), prior=before[key]??{qty:0,held:0}, next=after[key];
    if(prior.qty===next.qty && prior.held===next.held)continue;
    const at=Date.now();
    db.movements??=[];
    db.movements.push({...meta,key,at,site:l.site,item:l.item,code:l.code,before:prior.qty,after:next.qty,heldBefore:prior.held,heldAfter:next.held});
    db.sourceTimes??={};db.sourceTimes[l.site]=at;
  }
  return result;
}
const movementNames={intake:"입고",hold:"임시 예약",ship:"출고",receive:"수령",reject:"거절",cancel:"취소"};
export function apply(db,actor,action,id,data={}){
  const meta={ref:id??crypto.randomUUID(),actor:directory(db).sites[actor]?.name,kind:movementNames[action]??action,reason:data.reason||movementNames[action]||action};
  return recordMovement(db,meta,()=>applyAction(db,actor,action,id,data));
}
export function applyAdminChange(db,site,item,edit){
  const meta={ref:crypto.randomUUID(),actor:edit.actor??"운영관리자",kind:adjustmentNames[edit.kind],reason:edit.reason};
  return recordMovement(db,meta,()=>adminChange(db,site,item,{...edit,ref:meta.ref}));
}
export function refreshExpiry(db,now=Date.now()){
  for(const request of db.requests){
    if(request.state!=="held" || request.until>now)continue;
    recordMovement(db,{ref:request.id,actor:"시스템",kind:"예약 만료",reason:"응답 기한 경과"},()=>{
      request.state="expired";
      request.history.push({time:request.until,text:"응답 기한 만료 · 예약 해제"});
    });
  }
}
export function regionStats(db,now=Date.now()){
  const {sites,items}=directory(db);
  const reservations = reservedByLot(db);
  const today = new Date().toISOString().slice(0,10);
  const freeByItem = new Map();
  for (const lot of db.lots) {
    if (lot.damaged || lot.expiry < today) continue;
    const key = lot.site + "/" + lot.item;
    const free = lot.qty - (reservations.get(lotKey(lot)) ?? 0);
    freeByItem.set(key, (freeByItem.get(key) ?? 0) + free);
  }
  const consumedByItem = new Map();
  for (const movement of db.movements ?? []) {
    if (movement.kind !== "사용" || movement.at <= now - 86400000) continue;
    const key = sites[movement.site]?.zone + "/" + movement.item;
    consumedByItem.set(key, (consumedByItem.get(key) ?? 0) + movement.before - movement.after);
  }
  return zones.flatMap((zone,z)=>{
    const members=Object.values(sites).filter(s=>s.zone===zone);
    const limits=db.regionLimits?.[zone]??{warn:100,danger:70,mult:1};
    const stale = members.some(site => freshness(db,site,now).stale);
    return items.map((name,item)=>{
      const available = members.reduce((sum, site) => {
        const free = freeByItem.get(site.id + "/" + item) ?? 0;
        return sum + availableAfterFloor(free, effectiveFloor(db,site.id,item), site.status);
      }, 0);
      const consumption = consumedByItem.get(zone + "/" + item) ?? 0;
      const baseline=[[30,18],[80,35]][z][item]??0;
      const demand=Math.ceil((baseline+consumption)*limits.mult),ratio=demand?100*available/demand:Infinity;
      const level=ratio<limits.danger?"위험":ratio<limits.warn?"경고":demand?"충족":"수요 없음";
      return {zone,item,name,available,consumption,demand,level,stale};
    });
  });
}
export function updateAlerts(db){
  const previous=db.regionLevels??{};
  const next={};
  for(const r of regionStats(db)){
    const key=r.zone+"/"+r.item;
    if(previous[key] && previous[key]!==r.level){
      db.alerts??=[];db.alerts.unshift({at:Date.now(),zone:r.zone,item:r.item,before:previous[key],after:r.level});
    }
    next[key]=r.level;
  }
  db.regionLevels=next;
}
