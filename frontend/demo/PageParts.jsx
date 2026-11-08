import {useDirectory} from "./DirectoryContext";
import React from "react";
import { sections, previewLink } from "./screens";

export function PageTabs({ org, page, current, tabs }) {
  return <nav className="page-tabs" aria-label="상세 메뉴">{tabs.map(([key,label]) =>
    <a key={key} aria-current={key === current ? "page" : undefined}
       href={`#${org}/${page}${key ? "/"+key : ""}`}>{label}</a>)}</nav>;
}

export function GridTable({ caption, heads, rows, empty = "표시할 기록이 없습니다." }) {
  return <div className="scroll"><table className="report-table" aria-label={caption}>
    <thead><tr>{heads.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((row,i) => <tr key={i}>{row.map((v,j) =>
      j === 0 ? <th key={j} scope="row">{v}</th> : <td key={j}>{v}</td>)}</tr>) :
      <tr><td colSpan={heads.length}>{empty}</td></tr>}</tbody>
  </table></div>;
}

export function ScreenIndex() {
  return <><div className="screen-index">{sections.map(([title,rows]) =>
    <section key={title}><h2>{title}</h2><ul>{rows.map(([name,path]) =>
      <li key={name}><a href={previewLink(name,path)}>{name}<span aria-hidden="true">›</span></a></li>)}</ul></section>)}</div>
    <section className="ledger"><h2>업무 이어서 하기</h2><p className="screen-note">위 목록은 각 단계의 예시입니다. 직접 입력한 재고와 요청을 이어서 보려면 아래에서 시작하세요.</p>
    <div className="admin-links"><a href="?demo=1#H/stock">기관 재고 열기</a><a href="?demo=1#H/adjust">관리자 재고 조정</a><a href="?demo=1#H/reader">분석자 수급 조회</a></div></section></>;
}
export function Field({ label, value, options, ...props }) {
  return <label>{label}{options ? <select defaultValue={value} {...props}>{options.map(o=><option key={o}>{o}</option>)}</select> :
    <input defaultValue={value} {...props}/>}</label>;
}
export function MovementTable({entries}){
  const {sites,items}=useDirectory();
  return <GridTable caption="재고 이동 이력" heads={["처리 시각","요청·기록 번호","기관 · 의약품","로트","처리자","유형","실재고 전 → 후","예약 전 → 후","사유"]}
    rows={[...entries].reverse().map(m=>[new Date(m.at).toLocaleString("ko-KR"),m.ref,sites[m.site].name+" · "+items[m.item],m.code,m.actor,m.kind,m.before+" → "+m.after,m.heldBefore+" → "+m.heldAfter,m.reason])}
    empty="기초 잔액 이후 기록된 이동이 없습니다."/>;
}
