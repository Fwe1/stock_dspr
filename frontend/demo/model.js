export const sites = {
  H: { name: "한빛의료원", x: 608, y: 350 },
  A: { name: "새봄의료원", x: 727, y: 303 },
  B: { name: "솔빛의료원", x: 393, y: 390 },
  C: { name: "다온의료원", x: 932, y: 188, stale: true }
};
export const items = ["아세트아미노펜정 500 mg", "아목시실린캡슐 250 mg"];
export const labels = { open: "미배정", held: "응답 대기", accepted: "출고 대기", shipped: "이송 중", received: "수령 완료", cancelled: "취소", rejected: "거절", expired: "예약 만료", failed: "이송 실패" };
export const storageKey = "stock-dispenser:transfer-demo:1";
const floors = { H: [10, 5], A: [10, 5], B: [10, 5], C: [10, 5] };

export function seed() {
  const expiry = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const lots = Object.keys(sites).flatMap((site, index) => [0, 1].map(item => ({
    site, item, code: site + "-01" + item, expiry, qty: (item === 0 ? [18, 45, 25, 80] : [6, 35, 15, 18])[index]
  })));
  const created = Date.now();
  const sample = { id: "TR-001", from: "H", item: 0, qty: 20, due: created + 86400000,
    dest: "한빛의료원 본관 약제실", reason: "병동 투약분 보충", range: 5, priority: "일반", state: "open",
    history: [{ time: created, text: "전배 요청 등록" }] };
  return { lots, requests: [sample], next: 2 };
}

export function readDemo() {
  const value = localStorage.getItem(storageKey);
  return value ? JSON.parse(value) : seed();
}

export function refreshExpiry(db, now = Date.now()) {
  for (const r of db.requests) {
    if (r.state === "held" && r.until <= now) {
      r.state = "expired";
      r.history.push({ time: r.until, text: "응답 기한 만료 · 예약 해제" });
    }
  }
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
export function balance(db, site, item, date = new Date().toISOString().slice(0,10)) {
  const free = usable(db, site, item, date).reduce((s,l) => s + l.qty - reserved(db,l),0);
  return { floor: floors[site][item], available: Math.max(0, free - floors[site][item]) };
}
export function candidates(db, r) {
  const from = sites[r.from], neededDay = new Date(r.due).toISOString().slice(0,10);
  return Object.entries(sites).filter(([id]) => id !== r.from).map(([id,site]) => {
    const km = Math.hypot(site.x - from.x,site.y - from.y) / 100;
    const {available} = balance(db,id,r.item,neededDay);
    let reason = "";
    if (Date.now() >= r.due) reason = "필요 시각 경과";
    else if (km > r.range) reason = "검색 반경 밖";
    else if (site.stale) reason = "재고 갱신 지연";
    else if (available < r.qty) reason = (r.qty - available) + "개 부족";
    return { id, km, available, reason };
  }).sort((a,b) => Number(!!a.reason)-Number(!!b.reason) || a.km-b.km);
}
function credit(db, site, item, code, expiry, qty, damaged = false) {
  if (!qty) return;
  const existing = db.lots.find(l => l.site === site && l.item === item && l.code === code && l.expiry === expiry && !!l.damaged === damaged);
  if (existing) existing.qty += qty;
  else db.lots.push({site,item,code,expiry,qty,damaged});
}
export function apply(db, actor, action, id, data = {}) {
  ensure(sites[actor], "기관을 확인해 주세요.");
  if (action === "new") {
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

export async function changeDemo(edit) {
  const update = () => {
    const db=readDemo();
    refreshExpiry(db);
    const result=edit?.(db);
    const json=JSON.stringify(db);
    if (json!==localStorage.getItem(storageKey)) localStorage.setItem(storageKey,json);
    return {db,result};
  };
  return navigator.locks ? navigator.locks.request(storageKey,update) : update();
}
