export const sites = {
  H: { name: "한빛의료원", x: 608, y: 350 },
  A: { name: "새봄의료원", x: 727, y: 303 },
  B: { name: "솔빛의료원", x: 393, y: 390 },
  C: { name: "다온의료원", x: 932, y: 188, stale: true }
};
export const items = ["아세트아미노펜정 500 mg", "아목시실린캡슐 250 mg"];
export const zones = ["서부권","동부권"];
const latitude = y => 37.51 + (350-y)/11100;
const longitude = x => 127.01 + (x-608)/8800;
const facilities = Object.entries(sites).map(([id,s],i)=>({
  id, name:s.name, type:"의료기관", zone:zones[i%2], address:["서부로 12","중앙로 54","서부로 38","동부로 91"][i],
  latitude:latitude(s.y).toFixed(6),longitude:longitude(s.x).toFixed(6),cycle:60,status:"운영 중",shipping:"가능"
}));
const medicines = items.map((name,i)=>({id:"M-00"+(i+1),name,ref:"DEMO-00"+(i+1),
  ingredient:["아세트아미노펜","아목시실린"][i],dose:["500 mg","250 mg"][i],unit:["정","캡슐"][i],storage:"실온"}));
export function catalogRows(db,page) {
  return db.catalog?.[page] ?? (page==="facilities"?facilities:medicines);
}
export function directory(db) {
  const bySite=Object.fromEntries(catalogRows(db,"facilities").map(site=>{
    const located=site.latitude!=="" && site.longitude!=="" && Number.isFinite(+site.latitude)&&Number.isFinite(+site.longitude);
    return [site.id,{...site,located,x:608+(site.longitude-127.01)*8800,y:350-(site.latitude-37.51)*11100}];
  }));
  return {sites:bySite,items:catalogRows(db,"medicines").map(m=>m.name)};
}
export function freshness(db,site,now=Date.now()) {
  const origin=db.startedAt ?? db.requests.at(-1)?.history[0].time ?? now;
  const source=db.sourceTimes?.[site.id] ?? origin-(site.id==="C"?7200000:0);
  return {source,projected:db.sourceTimes?.[site.id] ?? origin,stale:now-source>Number(site.cycle)*60000};
}
