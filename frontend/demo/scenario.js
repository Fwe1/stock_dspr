const weights=[0.4,0.3,0.2,0.1];
export function weighted(...values){
  return values.reduce((sum,value,index)=>sum+weights[index]*Math.max(0,Math.min(1,value)),0);
}
export const scenarioDefaults={seed:1108,sites:6,meds:2,initial:150,life:14,usage:4,mult:2,count:100};
const policies=["최근접","종합 점수","최대 재고","임박 유효기간"];
function chooseProvider(lots, loads, event, day, policy, count) {
  let best;
  for (let site = 0; site < lots.length; site++) {
    const lot = lots[site][event.m];
    const km = Math.abs(site - event.s) * 1.2;
    if (site === event.s || km > 10 || lot.life <= day || lot.q - event.qty < 10) continue;

    let priority;
    switch (policy) {
      case "최근접": priority = km; break;
      case "최대 재고": priority = -lot.q; break;
      case "임박 유효기간": priority = lot.life; break;
      default: priority = weighted(km / 10, event.qty / (lot.q - 10), (lot.life - day) / 365, loads[site] / count);
    }
    // Equal priority is resolved by expiry, distance, then the ascending site index.
    const order = best ? (priority - best.priority || lot.life - best.lot.life || km - best.km) : -1;
    if (order < 0) best = {site, lot, km, priority};
  }
  return best;
}
function experiment(stock,eventsByDay,config,policy){
  const lots=structuredClone(stock);
  const loads=lots.map(()=>0), depleted=lots.map(()=>0), distances=[];
  let discarded=0;
  for(let day=0;day<7;day++){
    for(const event of eventsByDay[day]){
      const lot=lots[event.s][event.m];
      switch(event.kind){
        case "입고":
          if(lot.q===0)lot.life=day+config.life;
          lot.q+=event.qty;
          break;
        case "사용": lot.q=Math.max(0,lot.q-event.qty);break;
        case "폐기":
          if(lot.life<=day){discarded+=lot.q;lot.q=0;}
          break;
        case "요청": {
          const chosen = chooseProvider(lots, loads, event, day, policy, config.count);
          if (!chosen) break;
          chosen.lot.q -= event.qty;
          loads[chosen.site]++;
          distances.push(chosen.km);
          if (chosen.lot.q === 10) depleted[chosen.site]++;
          break;
        }
      }
    }
  }
  for(const meds of lots)for(const lot of meds)if(lot.life<=7)discarded+=lot.q;
  distances.sort((a,b)=>a-b);
  const n=distances.length;
  return [policy,n+"/"+config.count+" ("+(100*n/config.count).toFixed(1)+"%)",
    n?(distances.reduce((a,b)=>a+b,0)/n).toFixed(2):"—",n?distances[Math.ceil(n*.95)-1].toFixed(2):"—",
    depleted.map((v,i)=>v?(i+1)+"번 "+v+"회":"").filter(Boolean).join(", ")||"0회",
    n?(100*Math.max(...loads)/n).toFixed(1)+"%":"—",discarded];
}
export function simulate(config){
  const startedAt=Date.now();
  let state=config.seed>>>0;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const pick=max=>Math.floor(random()*max);
  const stock=Array.from({length:config.sites},()=>Array.from({length:config.meds},()=>({
    q:Math.round(config.initial*(0.6+0.8*random())),life:1+pick(config.life)
  })));
  const scheduled=[];
  stock.forEach((meds,s)=>meds.forEach((lot,m)=>{
    if(lot.life<7)scheduled.push({id:"EXP-"+s+"-"+m,day:lot.life,s,m,kind:"폐기",qty:null,delay:0});
  }));
  for(let day=0;day<7;day++){
    const s=pick(config.sites),m=pick(config.meds);
    scheduled.push({id:"IN-"+day,day,s,m,kind:"입고",qty:Math.ceil(config.initial/10),delay:day%3===1?1:0},
      {id:"USE-"+day,day,s,m,kind:"사용",qty:config.usage,delay:0});
  }
  for(let i=0;i<config.count;i++)scheduled.push({id:"REQ-"+i,day:Math.floor(i*7/config.count),s:pick(config.sites),m:pick(config.meds),kind:"요청",qty:1+pick(2*config.usage*config.mult),delay:0});
  const seen=new Set();
  const events=[...scheduled,...scheduled.filter(e=>e.id==="IN-2"||e.id==="USE-2")]
    .sort((a,b)=>(a.day+a.delay)-(b.day+b.delay)).map(e=>{
      const repeated=seen.has(e.id);seen.add(e.id);return {...e,repeated};
    });
  const eventsByDay = Array.from({length: 7}, () => []);
  for (const event of events) {
    const day = event.day + event.delay;
    if (!event.repeated && day < eventsByDay.length) eventsByDay[day].push(event);
  }
  const rows=policies.map(p=>experiment(stock,eventsByDay,config,p));
  return {config,startedAt,at:Date.now(),version:"alloc-experiment-3",source:"SYNTHETIC_REALTIME",events,rows};
}

export function reservationTrial(available,count){
  const seen=new Map();let remaining=available;
  function reserve(key){
    if(seen.has(key))return seen.get(key);
    const ok=remaining>0;
    if(ok)remaining--;
    seen.set(key,ok);return ok;
  }
  for(let i=0;i<count;i++)reserve(i);
  const beforeReplay=remaining;
  reserve(0);
  const transitions=["만료 우선","확정 우선"].map(order=>{
    let state="예약 중";
    for(const action of order==="만료 우선"?["만료","확정"]:["확정","만료"]){
      if(state==="예약 중")state=action;
    }
    return [order,state];
  });
  return {success:available-remaining,remaining,rejected:count-(available-remaining),replay:beforeReplay-remaining,transitions};
}
