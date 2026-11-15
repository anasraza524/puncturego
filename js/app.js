'use strict';
/* ===== PunctureGo core: config, mock API, auth, maps, business rules, UI helpers ===== */
const CFG={VEHICLES:['Bike','Car','Rickshaw'],SERVICES:['Puncture','Battery','Engine'],
 SVC:{Puncture:'Tyre puncture',Battery:'Battery jumpstart',Engine:'Engine / towing'},
 MAX_OPEN:2,CONC_LIMIT:{senior:3,disabled:4,women:2},PRIORITY:['disabled','women'],
 CONC:{senior:'Senior citizen',disabled:'Person with disability',women:'Woman travelling alone'},
 REASONS:['Customer unreachable','Wrong location','Parts unavailable','Road blocked','Vehicle moved','Other'],DEFAULT:[24.9204,67.0901]};
const OPEN=['Pending Approval','Approved','Assigned','Dispatched','Arrived'];
const ACTIVE_JOB=['Assigned','Dispatched','Arrived'];
const DEAD=['Cancelled','Rejected'];
const DONE=['Completed','Confirmed','Resolved'];
const ALL_STATUS=['Pending Approval','Approved','Assigned','Dispatched','Arrived','Completed','Failed','Confirmed','Disputed','Resolved','Rejected','Cancelled'];
const HOME={customer:'customer.html',officer:'officer.html',operator:'operator.html',technician:'technician.html',admin:'admin.html'};
const ROLE_LABEL={customer:'Customer',officer:'Area Verifier',operator:'Shop Operator',technician:'Technician',admin:'Administrator'};
const RX={cnic:/^\d{5}-\d{7}-\d$/,phone:/^03\d{2}-?\d{7}$/,wa:/^92\d{10}$/,email:/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,plate:/^[A-Z]{2,3}-\d{3,4}$/,veh:/^[A-Za-z]{2,3}-?\d{3,4}$/};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'Rs '+Number(n||0).toLocaleString('en-US');
const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>iso(new Date());
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const nowStr=()=>{const d=new Date();return iso(d)+' '+d.toTimeString().slice(0,5)};
const BADGE={'Pending Approval':'warning','Approved':'info','Rejected':'danger','Assigned':'primary','Dispatched':'primary','Arrived':'secondary','Completed':'success','Failed':'danger','Confirmed':'success','Disputed':'danger','Resolved':'success','Cancelled':'dark','Active':'success','Unavailable':'danger','Available':'success','Pending':'warning','Paid':'success','Unpaid':'warning','Refunded':'secondary','approved':'success','pending':'warning','rejected':'danger','none':'secondary'};
const badge=s=>`<span class="badge rounded-pill text-bg-${BADGE[s]||'secondary'}">${esc(s)}</span>`;
const svcName=s=>CFG.SVC[s]||s;

/* ---------- Mock API: GET data/<resource>.json via fetch(); writes kept in localStorage ---------- */
const API={
 async get(r){const k='pg_'+r,c=localStorage.getItem(k);if(c)return JSON.parse(c);
  let res;try{res=await fetch(`data/${r}.json`)}catch(e){throw new Error('Cannot reach the mock API. Open the site through a local server (see README).')}
  if(!res.ok)throw new Error(`Mock API error ${res.status} while loading "${r}"`);
  const d=await res.json();d.forEach(x=>{if('dayOffset' in x){x.date=addDays(x.dayOffset);delete x.dayOffset}});
  localStorage.setItem(k,JSON.stringify(d));return d},
 put(r,d){localStorage.setItem('pg_'+r,JSON.stringify(d))},
 async add(r,o,prefix){const d=await this.get(r);const n=Math.max(0,...d.map(x=>parseInt(String(x.id).replace(/\D/g,''))||0))+1;o.id=prefix?prefix+n:n;d.push(o);this.put(r,d);return o},
 async patch(r,id,p){const d=await this.get(r);const x=d.find(y=>y.id==id);if(!x)throw new Error('Record not found');Object.assign(x,p);this.put(r,d);return x},
 async del(r,id){this.put(r,(await this.get(r)).filter(x=>x.id!=id))},
 reset(){Object.keys(localStorage).filter(k=>k.startsWith('pg_')&&k!=='pg_theme').forEach(k=>localStorage.removeItem(k));sessionStorage.clear();location.href='index.html'}
};
const Auth={
 user(){try{return JSON.parse(sessionStorage.getItem('pg_user'))}catch{return null}},
 set(u){const{password,...s}=u;sessionStorage.setItem('pg_user',JSON.stringify(s))},
 guard(role){const u=this.user();if(!u){location.replace('login.html');return null}if(role&&u.role!==role){location.replace(HOME[u.role]);return null}return u},
 logout(){sessionStorage.removeItem('pg_user');location.href='login.html'}
};

/* ---------- Geo helpers (Leaflet + browser GPS) ---------- */
const hav=(a,b,c,d)=>{const r=x=>x*Math.PI/180,R=6371,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const km=x=>x.toFixed(1)+' km';
const mapsUrl=(lat,lng)=>`https://www.google.com/maps?q=${lat},${lng}`;
const waLink=(s,lat,lng)=>`https://wa.me/${s.phone}?text=`+encodeURIComponent(`Assalam-o-Alaikum ${s.name}, meri gaadi/bike kharab ho gayi hai. Meri live location yeh hai: ${mapsUrl(lat,lng)}`);
function gps(ok,fail){if(!('geolocation' in navigator))return fail();navigator.geolocation.getCurrentPosition(p=>ok(p.coords.latitude,p.coords.longitude,Math.round(p.coords.accuracy)),fail,{enableHighAccuracy:true,timeout:12000})}
function mapPicker(id,{lat,lng,zoom=14,onMove}){
 const map=L.map(id).setView([lat,lng],zoom);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
 const icon=L.divIcon({html:'<div class="pin" role="img" aria-label="Your location pin"></div>',className:'',iconSize:[22,22],iconAnchor:[11,11]});
 const marker=L.marker([lat,lng],{icon,draggable:true,keyboard:true,title:'Drag to set your location'}).addTo(map);
 const set=(a,b,pan)=>{marker.setLatLng([a,b]);if(pan)map.setView([a,b],15);onMove&&onMove(a,b)};
 marker.on('dragend',()=>{const p=marker.getLatLng();set(p.lat,p.lng)});map.on('click',e=>set(e.latlng.lat,e.latlng.lng));
 return{map,marker,set,pos:()=>{const p=marker.getLatLng();return[p.lat,p.lng]}};
}
const isOpen=(s,d=new Date())=>{if(s.is247)return true;const m=d.getHours()*60+d.getMinutes();return m>=Rules.mins(s.open)&&m<Rules.mins(s.close)};
const hours=s=>s.is247?'Open 24/7':`${s.open}–${s.close}`;
const priceOf=(rates,v,svc,t)=>rates.find(r=>r.vehicle===v&&r.service===svc)?.[t==='concession'?'concession':'standard']??0;

/* ---------- Business rules shared by every role screen (server re-enforces in phase 2) ---------- */
const Rules={
 mins:t=>{const[h,m]=t.split(':').map(Number);return h*60+m},
 used:(rq,shopId,date,ex)=>rq.filter(b=>b.shopId==shopId&&b.date===date&&b.id!==ex&&!DEAD.includes(b.status)).length,
 left:(rq,s,date)=>s.capacity-Rules.used(rq,s.id,date),
 supports:(s,v,svc)=>(!v||s.vehicles.includes(v))&&(!svc||s.services.includes(svc)),
 openCount:(rq,uid)=>rq.filter(b=>b.customerId==uid&&OPEN.includes(b.status)).length,
 monthUsed:(rq,uid,ym)=>rq.filter(b=>b.customerId==uid&&b.type==='concession'&&b.date.slice(0,7)===ym&&!DEAD.includes(b.status)).length,
 busy:(rq,{unitId,techId,ex})=>rq.find(b=>b.id!==ex&&ACTIVE_JOB.includes(b.status)&&((unitId&&b.unitId==unitId)||(techId&&b.techId==techId)))
};
async function moveReq(id,{to,by,note='',extra={},from}){
 const d=await API.get('requests'),b=d.find(x=>x.id==id);if(!b)throw new Error('Request not found');
 if(from&&!from.includes(b.status))throw new Error(`Request is already "${b.status}" – refresh and try again.`);
 Object.assign(b,extra);b.status=to;(b.history??=[]).push({status:to,at:nowStr(),by,note});API.put('requests',d);return b}

/* ---------- UI helpers ---------- */
function initTheme(){const set=t=>{document.documentElement.setAttribute('data-bs-theme',t);localStorage.setItem('pg_theme',t)};set(localStorage.getItem('pg_theme')||'light');
 document.addEventListener('click',e=>{if(e.target.closest('#themeBtn'))set(document.documentElement.dataset.bsTheme==='dark'?'light':'dark')});
 document.addEventListener('input',e=>e.target.classList?.remove('is-invalid'))}
initTheme();
function ensureUI(){if($('#appModal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal fade" id="appModal" tabindex="-1" aria-labelledby="appModalTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h2 class="modal-title fs-5" id="appModalTitle"></h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"></div><div class="modal-footer"></div></div></div></div><div class="toast-container position-fixed bottom-0 end-0 p-3" id="toasts"></div>`)}
function toast(msg,type='success'){ensureUI();const t=document.createElement('div');t.className=`toast align-items-center text-bg-${type} border-0`;t.setAttribute('role','status');t.innerHTML=`<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;$('#toasts').append(t);t.addEventListener('hidden.bs.toast',()=>t.remove());new bootstrap.Toast(t,{delay:3500}).show()}
function modal({title,body,ok,okClass='btn-primary',onOk,size}){
 ensureUI();const el=$('#appModal');$('.modal-title',el).textContent=title;$('.modal-body',el).innerHTML=body;
 $('.modal-dialog',el).className='modal-dialog modal-dialog-centered modal-dialog-scrollable'+(size?' modal-'+size:'');
 $('.modal-footer',el).innerHTML=`<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">${ok?'Cancel':'Close'}</button>`+(ok?`<button type="button" class="btn ${okClass}" id="modalOk">${ok}</button>`:'');
 const m=bootstrap.Modal.getOrCreateInstance(el);
 if(ok)$('#modalOk').onclick=async()=>{const b=$('#modalOk');b.disabled=true;try{if(await onOk($('.modal-body',el))!==false)m.hide()}catch(e){toast(e.message,'danger')}finally{b.disabled=false}};
 m.show();return m}
const fld=(id,label,ctl,cls='col-12')=>`<div class="${cls}"><label class="form-label" for="${id}">${label}</label>${ctl}<div class="invalid-feedback"></div></div>`;
function validate(form,rules){let ok=true,first=null;
 for(const[n,fn]of Object.entries(rules)){const el=form.elements[n];if(!el)continue;const m=fn((el.value||'').trim(),form)||'';
  el.classList.toggle('is-invalid',!!m);el.setAttribute('aria-invalid',String(!!m));
  let fb=el.parentElement.querySelector(':scope > .invalid-feedback');if(!fb){fb=document.createElement('div');fb.className='invalid-feedback';el.after(fb)}
  fb.textContent=m;if(m){ok=false;first??=el}}
 if(first&&first.type!=='hidden')first.focus();return ok}
async function boot(fn){try{await fn()}catch(e){const a=$('#app');if(a)a.innerHTML=`<div class="container py-5"><div class="alert alert-danger" role="alert"><strong>Could not load data.</strong> ${esc(e.message)}</div></div>`;console.error(e)}}
function shell(user){
 $('#nav').innerHTML=`<nav class="navbar app-nav sticky-top"><div class="container-xl px-3"><a class="navbar-brand fw-bold text-white" href="index.html"><i class="bi bi-wrench-adjustable-circle-fill"></i> Puncture<span class="brand-go">Go</span></a><div class="ms-auto d-flex align-items-center gap-2"><a class="btn btn-sm btn-outline-light d-none d-sm-inline" href="index.html"><i class="bi bi-geo-alt"></i> Find mechanics</a><span class="d-none d-md-inline small text-white">${esc(user.name)}</span><span class="badge bg-light text-dark">${ROLE_LABEL[user.role]}</span><button class="btn btn-sm btn-outline-light" id="themeBtn" aria-label="Toggle dark mode"><i class="bi bi-circle-half"></i></button><button class="btn btn-sm btn-light" id="logoutBtn" aria-label="Log out"><i class="bi bi-box-arrow-right"></i><span class="d-none d-sm-inline"> Logout</span></button></div></div></nav>`;
 document.body.insertAdjacentHTML('beforeend','<footer class="text-center small text-muted py-4">PunctureGo · mock API mode · <a href="#" id="resetDemo">Reset demo data</a></footer>');
 document.addEventListener('click',e=>{if(e.target.closest('#logoutBtn'))Auth.logout();if(e.target.closest('#resetDemo')){e.preventDefault();if(confirm('Reset all demo data to its original state?'))API.reset()}});ensureUI()}
let _tid=0;
function makeTable(host,{cols,search=[],filter,size=8,empty='No records found.',sortKey,sortDir=1}){
 const id='t'+(++_tid);let rows=[],q='',f='',sk=sortKey,sd=sortDir,pg=1;const val=(r,c)=>c.val?c.val(r):r[c.k];
 host.innerHTML=`<div class="row g-2 mb-3"><div class="col-12 ${filter?'col-md-7':''}"><div class="input-group"><span class="input-group-text" aria-hidden="true"><i class="bi bi-search"></i></span><input id="${id}q" type="search" class="form-control" placeholder="Search…" aria-label="Search table"></div></div>${filter?`<div class="col-12 col-md-5"><select id="${id}f" class="form-select" aria-label="Filter by ${filter.label}"><option value="">All ${filter.label}</option>${filter.options.map(o=>`<option>${esc(o)}</option>`).join('')}</select></div>`:''}</div><div class="table-responsive"><table class="table table-hover align-middle table-stack mb-2"><thead><tr>${cols.map((c,i)=>`<th scope="col" ${c.sort?`class="sortable" data-i="${i}" role="button" tabindex="0"`:''}>${c.label}</th>`).join('')}</tr></thead><tbody></tbody></table></div><div class="d-flex flex-wrap justify-content-between align-items-center gap-2"><small class="text-muted"></small><ul class="pagination pagination-sm mb-0"></ul></div>`;
 const tb=$('tbody',host),info=$('small',host),pag=$('.pagination',host);
 function draw(){let d=rows.filter(r=>(!f||(filter.get?filter.get(r):r[filter.key])==f)&&(!q||search.some(k=>String(typeof k==='function'?k(r):r[k]??'').toLowerCase().includes(q))));
  if(sk!=null){const c=cols[sk];d.sort((a,b)=>{const x=val(a,c),y=val(b,c);return(x>y?1:x<y?-1:0)*sd})}
  const pages=Math.max(1,Math.ceil(d.length/size));pg=Math.min(pg,pages);
  tb.innerHTML=d.slice((pg-1)*size,pg*size).map(r=>`<tr>${cols.map(c=>`<td data-label="${esc(c.label)}">${c.render?c.render(r):esc(val(r,c))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}" class="text-center text-muted py-4">${empty}</td></tr>`;
  info.textContent=`${d.length} record${d.length==1?'':'s'}`;
  pag.innerHTML=Array.from({length:pages},(_,i)=>`<li class="page-item ${i+1==pg?'active':''}"><button type="button" class="page-link" data-pg="${i+1}" aria-label="Page ${i+1}">${i+1}</button></li>`).join('');
  $$('th.sortable',host).forEach(th=>th.setAttribute('aria-sort',+th.dataset.i===sk?(sd>0?'ascending':'descending'):'none'))}
 $('#'+id+'q').oninput=e=>{q=e.target.value.toLowerCase();pg=1;draw()};
 if(filter)$('#'+id+'f').onchange=e=>{f=e.target.value;pg=1;draw()};
 host.addEventListener('click',e=>{const th=e.target.closest('th.sortable'),p=e.target.closest('[data-pg]');if(th){const i=+th.dataset.i;sd=sk===i?-sd:1;sk=i;draw()}if(p){pg=+p.dataset.pg;draw()}});
 host.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('th.sortable'))e.target.click()});
 return{set(r){rows=r;draw()}}}
const STEP={Approved:0,Assigned:1,Dispatched:2,Arrived:3,Completed:4,Failed:4,Confirmed:5,Disputed:5,Resolved:5};
const STEPS=['Approved','Assigned','On the way','Arrived','Completed','Closed'];
function stepper(b){if(DEAD.includes(b.status))return`<div class="alert alert-secondary py-2">This request was ${b.status.toLowerCase()}.</div>`;
 const i=STEP[b.status]??-1,bad=['Failed','Disputed'].includes(b.status);
 return`<ol class="stepper" aria-label="Job progress">${STEPS.map((s,k)=>`<li class="${k<i?'done':k==i?(bad?'bad':'now'):''}"><span>${k<i?'<i class="bi bi-check-lg"></i>':k+1}</span><small>${s}</small></li>`).join('')}</ol>`}
const timeline=b=>`<h3 class="h6 mt-3">Job trail</h3><ul class="timeline">${(b.history||[]).map(e=>`<li><div>${badge(e.status)} <small class="text-muted">${esc(e.at)} · ${esc(e.by)}</small></div>${e.note?`<div class="small">${esc(e.note)}</div>`:''}</li>`).join('')||'<li class="text-muted">No events yet</li>'}</ul>`;
function detailHtml(b,m,{readOnly=false}={}){
 const u=id=>m.users.find(x=>x.id==id),s=m.shops.find(x=>x.id==b.shopId),t=(m.units||[]).find(x=>x.id==b.unitId),d=u(b.techId),c=u(b.customerId);
 const row=(k,v)=>`<dt class="col-5 col-sm-4">${k}</dt><dd class="col-7 col-sm-8">${v||'—'}</dd>`;
 return`${readOnly?'<div class="alert alert-info py-2 small"><i class="bi bi-lock"></i> Read-only view: you can see this job but cannot change its technician or unit.</div>':''}${stepper(b)}<dl class="row mb-0">${row('Status',badge(b.status)+(b.priority?' <span class="badge text-bg-danger">Priority</span>':''))}${row('Customer',c?esc(c.name)+' · '+esc(c.phone):'')}${row('Vehicle',esc(b.vehicle)+' · '+esc(b.vehicleNo))}${row('Problem',esc(svcName(b.service)))}${row('Location',esc(b.landmark)+` · <a href="${mapsUrl(b.lat,b.lng)}" target="_blank" rel="noopener">Open in Maps</a>`)}${row('Shop',s?esc(s.name):'')}${row('Type',esc(b.type))}${row('Requested',esc(b.date)+' · '+esc(b.time))}${row('Charge',money(b.amount)+' · '+badge(b.payment))}${row('Service unit',t?esc(t.plate)+' ('+esc(t.vehicle)+')':'')}${row('Technician',d?esc(d.name)+' · '+esc(d.phone):'')}${b.notes?row('Notes',esc(b.notes)):''}${b.failReason?row('Failure reason',esc(b.failReason)):''}${b.disputeReason?row('Dispute',esc(b.disputeReason)):''}${b.resolution?row('Resolution',esc(b.resolution)):''}${b.rejectReason?row('Rejected because',esc(b.rejectReason)):''}</dl>${timeline(b)}`}
function exportCsv(name,rows){if(!rows.length)return toast('Nothing to export','warning');const k=Object.keys(rows[0]).filter(x=>typeof rows[0][x]!=='object');const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([[k.join(','),...rows.map(r=>k.map(x=>q(r[x])).join(','))].join('\n')],{type:'text/csv'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
const statCard=(i,l,v,c='primary')=>`<div class="col-6 col-lg-3"><div class="card card-soft h-100"><div class="card-body"><span class="stat-icon bg-${c}-subtle text-${c}-emphasis"><i class="bi bi-${i}"></i></span><div class="stat-val">${v}</div><div class="text-muted small">${l}</div></div></div></div>`;
const optList=(arr,sel)=>arr.map(x=>`<option value="${esc(x)}" ${sel&&sel.includes(x)?'selected':''}>${esc(svcName(x))}</option>`).join('');
