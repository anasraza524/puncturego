boot(async()=>{
 const me=Auth.guard('customer');if(!me)return;shell(me);
 let S,mp=null,pinned=false,pick=null;
 const load=async()=>{const[users,areas,shops,units,all,rates,apps]=await Promise.all(['users','areas','shops','units','requests','rates','applications'].map(r=>API.get(r)));
  const user=users.find(u=>u.id==me.id);S={users,areas,shops,units,all,rates,user,reqs:all.filter(b=>b.customerId==me.id),apps:apps.filter(a=>a.customerId==me.id),act:shops.filter(s=>s.status==='Active'),area:areas.find(z=>z.id==user.areaId)}};
 const refresh=async()=>{await load();renderAll()};
 const goTab=k=>bootstrap.Tab.getOrCreateInstance($(`[data-bs-target="#p-${k}"]`)).show();
 const shopName=id=>S.shops.find(h=>h.id==id)?.name||'—';
 /* ---- Overview ---- */
 function renderOverview(){
  const b=S.reqs,open=b.filter(x=>OPEN.includes(x.status)),paid=b.filter(x=>x.payment==='Paid').reduce((s,x)=>s+x.amount,0);
  const next=[...open].sort((x,y)=>(y.date+y.time).localeCompare(x.date+x.time))[0],u=S.user,cat=u.concessionCategory,lim=CFG.CONC_LIMIT[cat]||0,used=Rules.monthUsed(S.all,me.id,today().slice(0,7));
  $('#hello').textContent=`Welcome, ${u.name}`;$('#sub').textContent=`${S.area?.name||''} · ${Rules.openCount(S.all,me.id)} of ${CFG.MAX_OPEN} open requests used`;
  const warn=u.concessionStatus==='approved'&&used>=lim?`<div class="alert alert-warning" role="alert"><i class="bi bi-exclamation-triangle"></i> You have used all ${lim} concession requests this month. New requests will be charged at the standard rate.</div>`:u.concessionStatus==='approved'&&used==lim-1?`<div class="alert alert-info" role="alert">One concession request left this month.</div>`:'';
  const sh=next&&S.shops.find(s=>s.id==next.shopId),tk=next&&S.users.find(x=>x.id==next.techId);
  $('#p-overview').innerHTML=`${warn}<div class="row g-3 mb-4">${statCard('life-preserver','Open requests',open.length)}${statCard('check2-circle','Jobs completed',b.filter(x=>DONE.includes(x.status)).length,'success')}${statCard('wallet2','Paid so far',money(paid),'info')}${statCard('patch-check','Concession','<span class="text-capitalize">'+u.concessionStatus+'</span>','warning')}</div>
  <div class="card card-soft"><div class="card-body"><h2 class="h5">Current job</h2>${next?`${stepper(next)}<div class="d-flex flex-wrap justify-content-between gap-2 align-items-center"><div><strong>${esc(next.id)}</strong> · ${esc(svcName(next.service))} · ${esc(next.vehicle)} ${badge(next.status)}<div class="small text-muted">${sh?esc(sh.name):''}${tk?' · Technician '+esc(tk.name)+' ('+esc(tk.phone)+')':' · Technician not assigned yet'}</div></div><div class="d-flex gap-2">${sh?`<a class="btn btn-outline-primary" href="tel:+${sh.phone}"><i class="bi bi-telephone"></i> Call shop</a>`:''}<button class="btn btn-primary" data-act="view" data-id="${esc(next.id)}">Track</button></div></div>`:'<p class="text-muted mb-0">No open requests. If you are stuck, tap “Request help”.</p>'}</div></div>`}
 /* ---- Request form ---- */
 function renderRequest(){
  const u=S.user,ok=u.concessionStatus==='approved',open=Rules.openCount(S.all,me.id);
  $('#p-request').innerHTML=`<div class="row g-4"><div class="col-lg-6"><div class="card card-soft"><div class="card-body p-4"><h2 class="h5 mb-1">Request roadside help</h2><p class="small text-muted">You can hold at most ${CFG.MAX_OPEN} open requests (you have ${open}).</p>
  <form id="reqForm" class="row g-3" novalidate>
  ${fld('vehicle','Vehicle type',`<select class="form-select" id="vehicle" name="vehicle"><option value="">Select</option>${optList(CFG.VEHICLES)}</select>`,'col-md-6')}
  ${fld('vehicleNo','Vehicle number',`<input class="form-control" id="vehicleNo" name="vehicleNo" placeholder="KHI-1234" maxlength="8" autocapitalize="characters">`,'col-md-6')}
  ${fld('service','Problem',`<select class="form-select" id="service" name="service"><option value="">Select</option>${CFG.SERVICES.map(s=>`<option value="${s}">${svcName(s)}</option>`).join('')}</select>`,'col-md-6')}
  ${fld('type','Request type',`<select class="form-select" id="type" name="type"><option value="standard">Standard rate</option><option value="concession" ${ok?'':'disabled'}>Concession${ok?'':' – needs approval'}</option></select>`,'col-md-6')}
  ${fld('shop','Mechanic shop (nearest first)',`<select class="form-select" id="shop" name="shop"><option value="">Select shop</option></select>`)}
  ${fld('landmark','Landmark near you',`<input class="form-control" id="landmark" name="landmark" maxlength="80" placeholder="e.g. Opposite Aladdin Park, main road">`)}
  <input type="hidden" id="pin" name="pin"><div class="invalid-feedback"></div>
  ${fld('notes','Note for technician (optional)',`<textarea class="form-control" id="notes" name="notes" rows="2" maxlength="120"></textarea>`)}
  <div class="col-12" id="formAlert"></div><div class="col-12 d-grid d-sm-block"><button class="btn btn-primary btn-lg px-4" type="submit">Send request</button></div></form></div></div></div>
  <div class="col-lg-6"><div class="card card-soft mb-3"><div class="card-body"><h2 class="h6" id="pinLbl">Your location</h2><div id="reqMap" class="map-box" role="application" aria-labelledby="pinLbl"></div><div class="d-flex flex-wrap gap-2 align-items-center mt-2"><button type="button" class="btn btn-outline-primary btn-sm" id="gpsBtn"><i class="bi bi-crosshair"></i> Use my GPS</button><small class="text-muted" id="pinTxt" role="status">Tap the map or use GPS to set your pin.</small></div></div></div>
  <div class="card card-soft"><div class="card-body"><h2 class="h6">Charge &amp; availability</h2><div id="preview" class="small text-muted" aria-live="polite">Pick vehicle, problem and shop.</div></div></div></div></div>`;
  try{mp?.map.remove()}catch{}
  const f=$('#reqForm'),base=S.user.lat?[S.user.lat,S.user.lng]:CFG.DEFAULT;
  mp=mapPicker('reqMap',{lat:base[0],lng:base[1],onMove:(a,b)=>{pinned=true;f.pin.value=a.toFixed(5)+','+b.toFixed(5);f.pin.classList.remove('is-invalid');$('#pinTxt').textContent=`Pin: ${a.toFixed(5)}, ${b.toFixed(5)}`;shopOpts();upd()}});
  $('#gpsBtn').onclick=()=>{$('#pinTxt').textContent='Locking GPS…';gps((a,b,acc)=>{mp.set(a,b,true);$('#pinTxt').textContent+=` · ~${acc} m`},()=>toast('GPS unavailable. Tap the map to place your pin.','warning'))};
  function shopOpts(){const v=f.vehicle.value,s=f.service.value,[a,b]=mp.pos(),cur=f.shop.value;
   const l=S.act.filter(x=>Rules.supports(x,v,s)).map(x=>({...x,d:hav(a,b,x.lat,x.lng)})).sort((p,q)=>p.d-q.d);
   f.shop.innerHTML='<option value="">Select shop</option>'+l.map(x=>`<option value="${x.id}">${esc(x.name)} – ${km(x.d)}${isOpen(x)?'':' (closed now)'}</option>`).join('');if(l.some(x=>x.id==cur))f.shop.value=cur}
  function upd(){const v=Object.fromEntries(new FormData(f)),sh=S.act.find(x=>x.id==v.shop);let t='';
   if(v.vehicle&&v.service)t+=`<div class="fs-4 fw-bold text-primary">${money(priceOf(S.rates,v.vehicle,v.service,v.type))}</div><div>${v.type==='concession'?'Concession':'Standard'} charge for ${esc(svcName(v.service)).toLowerCase()} (${esc(v.vehicle)})</div>`;
   if(sh){const[a,b]=mp.pos();t+=`<hr><div><i class="bi bi-clock"></i> ${hours(sh)} · ${isOpen(sh)?'<span class="text-success">open now</span>':'<span class="text-danger">closed now</span>'}</div><div><i class="bi bi-signpost-split"></i> ${km(hav(a,b,sh.lat,sh.lng))} from your pin</div><div><i class="bi bi-calendar-check"></i> Jobs left today: <strong>${Math.max(0,Rules.left(S.all,sh,today()))}</strong> of ${sh.capacity}</div>`}
   if(v.type==='concession'){const lim=CFG.CONC_LIMIT[S.user.concessionCategory]||0;t+=`<hr><div><i class="bi bi-patch-check"></i> Concession this month: ${Rules.monthUsed(S.all,me.id,today().slice(0,7))} of ${lim} used</div>`}
   $('#preview').innerHTML=t||'Pick vehicle, problem and shop.'}
  f.addEventListener('change',e=>{if(['vehicle','service'].includes(e.target.name))shopOpts();upd()});
  f.onsubmit=async e=>{e.preventDefault();await load();const v=Object.fromEntries(new FormData(f)),sh=S.act.find(x=>x.id==v.shop),conc=v.type==='concession',cat=S.user.concessionCategory,lim=CFG.CONC_LIMIT[cat]||0;
   const rules={
    vehicle:x=>x?'':'Select your vehicle type',
    vehicleNo:x=>RX.veh.test(x)?'':'Format: KHI-1234 or ABC-123',
    service:x=>x?'':'Select the problem',
    type:x=>conc?(S.user.concessionStatus!=='approved'?'Your concession is not approved':Rules.monthUsed(S.all,me.id,today().slice(0,7))>=lim?`Monthly concession limit reached (${lim})`:''):'',
    shop:x=>!x?'Select a mechanic shop':!sh?'This shop is not available':!Rules.supports(sh,v.vehicle,v.service)?'This shop does not handle that vehicle or problem':!isOpen(sh)?`Shop is closed now (hours ${hours(sh)})`:Rules.left(S.all,sh,today())<=0?'Shop reached its daily job capacity – choose another':'',
    landmark:x=>x.length<5?'Describe a nearby landmark (min 5 characters)':'',
    pin:x=>x?'':'Tap the map or use GPS to set your exact location'};
   if(!validate(f,rules))return;
   if(Rules.openCount(S.all,me.id)>=CFG.MAX_OPEN){$('#formAlert').innerHTML=`<div class="alert alert-warning py-2" role="alert">Limit reached: you can hold only ${CFG.MAX_OPEN} open requests. Cancel or finish one first.</div>`;return}
   const[lat,lng]=v.pin.split(',').map(Number);
   const r=await API.add('requests',{customerId:me.id,areaId:sh.areaId,shopId:sh.id,vehicle:v.vehicle,vehicleNo:v.vehicleNo.toUpperCase(),service:v.service,type:v.type,lat,lng,landmark:v.landmark,notes:v.notes,date:today(),time:nowStr().slice(11),amount:priceOf(S.rates,v.vehicle,v.service,v.type),payment:'Unpaid',status:conc?'Pending Approval':'Approved',priority:conc&&CFG.PRIORITY.includes(cat),unitId:null,techId:null,createdAt:nowStr(),
    history:[{status:conc?'Pending Approval':'Approved',at:nowStr(),by:conc?S.user.name:'System',note:conc?'Waiting for Area Verifier approval':'Standard request auto-approved'}]},'RQ-');
   toast(`Request ${r.id} sent`);pinned=false;await refresh();goTab('requests')};
  if(pick){f.vehicle.value=pick.vehicle||'';f.service.value=pick.service||'';mp.set(pick.lat,pick.lng,true);shopOpts();if(pick.shopId)f.shop.value=pick.shopId;upd();pick=null}
 }
 /* ---- Requests table ---- */
 const bt=makeTable($('#p-requests'),{search:['id','vehicle','status',r=>shopName(r.shopId),r=>svcName(r.service)],filter:{label:'statuses',key:'status',options:ALL_STATUS},sortKey:1,sortDir:-1,
  cols:[{label:'ID',k:'id',sort:1},{label:'When',val:b=>b.date+' '+b.time,sort:1},{label:'Vehicle',val:b=>b.vehicle+' · '+b.vehicleNo},{label:'Problem',val:b=>svcName(b.service)},{label:'Shop',val:b=>shopName(b.shopId)},{label:'Status',k:'status',sort:1,render:b=>badge(b.status)},{label:'Charge',k:'amount',sort:1,render:b=>money(b.amount)},
  {label:'Actions',render:b=>`<div class="d-flex flex-wrap gap-1 justify-content-end"><button class="btn btn-sm btn-outline-primary" data-act="view" data-id="${esc(b.id)}" aria-label="Track ${esc(b.id)}"><i class="bi bi-eye"></i></button>${['Pending Approval','Approved'].includes(b.status)?`<button class="btn btn-sm btn-outline-danger" data-act="cancel" data-id="${esc(b.id)}">Cancel</button>`:''}${b.status==='Completed'?`<button class="btn btn-sm btn-success" data-act="confirm" data-id="${esc(b.id)}">Confirm</button>`:''}${['Completed','Failed'].includes(b.status)?`<button class="btn btn-sm btn-outline-warning" data-act="dispute" data-id="${esc(b.id)}">Dispute</button>`:''}</div>`}]});
 $('#p-requests').insertAdjacentHTML('afterbegin','<div class="d-flex justify-content-end mb-2"><button class="btn btn-outline-primary btn-sm" data-act="csv"><i class="bi bi-download"></i> Export history (CSV)</button></div>');
 const billT=makeTable($('#p-bills'),{search:['id','date'],filter:{label:'payments',key:'payment',options:['Paid','Unpaid','Refunded']},sortKey:1,sortDir:-1,
  cols:[{label:'Request',k:'id',sort:1},{label:'Date',k:'date',sort:1},{label:'Type',k:'type'},{label:'Amount',k:'amount',sort:1,render:b=>money(b.amount)},{label:'Payment',k:'payment',render:b=>badge(b.payment)},{label:'Action',render:b=>b.payment==='Unpaid'&&DONE.includes(b.status)?`<button class="btn btn-sm btn-primary" data-act="pay" data-id="${esc(b.id)}">Pay now</button>`:'—'}]});
 function renderBills(){const bl=S.reqs.filter(b=>!DEAD.includes(b.status)),sum=f=>money(bl.filter(f).reduce((s,b)=>s+b.amount,0));
  $('#bill-sum')?.remove();$('#p-bills').insertAdjacentHTML('afterbegin',`<div class="row g-3 mb-3" id="bill-sum">${statCard('receipt','Total billed',sum(()=>true))}${statCard('check2','Paid',sum(b=>b.payment==='Paid'),'success')}${statCard('hourglass-split','Outstanding (completed jobs)',sum(b=>b.payment==='Unpaid'&&DONE.includes(b.status)),'warning')}</div>`);billT.set(bl)}
 /* ---- Profile & concession ---- */
 function renderProfile(){
  const u=S.user,st=u.concessionStatus,lim=CFG.CONC_LIMIT[u.concessionCategory]||0;
  $('#p-profile').innerHTML=`<div class="row g-4"><div class="col-lg-6"><div class="card card-soft"><div class="card-body p-4"><h2 class="h5">My details</h2><p class="small text-muted">CNIC ${esc(u.cnic)} · ${esc(S.area?.name)} · ${esc(u.email)}</p>
  <form id="profForm" class="row g-3" novalidate>${fld('pphone','Mobile number',`<input class="form-control" id="pphone" name="pphone" value="${esc(u.phone)}">`)}${fld('paddr','Address',`<textarea class="form-control" id="paddr" name="paddr" rows="2">${esc(u.address)}</textarea>`)}<div class="col-12 d-grid d-sm-block"><button class="btn btn-primary" type="submit">Save changes</button></div></form></div></div></div>
  <div class="col-lg-6"><div class="card card-soft"><div class="card-body p-4"><h2 class="h5">Concession status ${badge(st)}</h2>
  ${st==='approved'?`<p class="mb-1">Category: <strong>${esc(CFG.CONC[u.concessionCategory])}</strong></p><p class="text-muted mb-0">Monthly limit: ${Rules.monthUsed(S.all,me.id,today().slice(0,7))} of ${lim} concession requests used this month.</p>`:st==='pending'?'<div class="alert alert-info mb-0">Your application is with the Area Verifier.</div>':`${st==='rejected'?'<div class="alert alert-danger py-2">Your last application was rejected. You may re-apply.</div>':''}
  <form id="concForm" class="row g-3" novalidate>${fld('category','Category',`<select class="form-select" id="category" name="category"><option value="">Select</option>${Object.entries(CFG.CONC).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select>`,'col-md-6')}
  ${fld('proofType','Proof document',`<select class="form-select" id="proofType" name="proofType"><option value="">Select</option><option>CNIC verification</option><option>Senior citizen card</option><option>Disability certificate</option></select>`,'col-md-6')}
  ${fld('proofNo','Proof / reference number',`<input class="form-control" id="proofNo" name="proofNo" maxlength="30">`)}${fld('note','Additional details (optional)',`<textarea class="form-control" id="note" name="note" rows="2" maxlength="200"></textarea>`)}
  <div class="col-12 d-grid d-sm-block"><button class="btn btn-primary" type="submit">Apply for concession</button></div></form>`}
  ${S.apps.length?`<hr><h3 class="h6">Application history</h3><ul class="list-unstyled small mb-0">${S.apps.map(a=>`<li>${esc(a.createdAt)} · ${esc(CFG.CONC[a.category])} · ${badge(a.status)} ${esc(a.decisionNote)}</li>`).join('')}</ul>`:''}</div></div></div></div>`;
  $('#profForm').onsubmit=async e=>{e.preventDefault();const f=e.target;
   if(!validate(f,{pphone:v=>RX.phone.test(v)?'':'Format: 0300-1234567',paddr:v=>v.length<10?'Enter a full address (min 10 characters)':''}))return;
   await API.patch('users',me.id,{phone:f.pphone.value.trim(),address:f.paddr.value.trim()});toast('Profile updated');await refresh()};
  const cf=$('#concForm');if(cf)cf.onsubmit=async e=>{e.preventDefault();
   if(!validate(cf,{category:v=>v?'':'Select a category',proofType:v=>v?'':'Select a proof document',proofNo:v=>/^[A-Za-z0-9-]{5,30}$/.test(v)?'':'Enter 5–30 letters, digits or dashes'}))return;
   await API.add('applications',{customerId:me.id,areaId:u.areaId,category:cf.category.value,proofType:cf.proofType.value,proofNo:cf.proofNo.value.trim(),note:cf.note.value.trim(),status:'Pending',decisionNote:'',createdAt:nowStr()});
   await API.patch('users',me.id,{concessionStatus:'pending'});toast('Application sent to your Area Verifier');await refresh()}}
 const renderAll=()=>{renderOverview();renderRequest();renderBills();renderProfile();bt.set(S.reqs)};
 /* ---- Actions (role + status based) ---- */
 $('#app').addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const id=el.dataset.id,b=S.reqs.find(x=>x.id==id),a=el.dataset.act;
  if(a==='view')modal({title:'Request '+id,body:detailHtml(b,S),size:'lg'});
  if(a==='csv')exportCsv('my-requests.csv',S.reqs);
  if(a==='cancel')modal({title:'Cancel request?',body:`<p>Cancel <strong>${esc(id)}</strong>? The shop's daily capacity is released.</p>`,ok:'Yes, cancel',okClass:'btn-danger',onOk:async()=>{await moveReq(id,{from:['Pending Approval','Approved'],to:'Cancelled',by:S.user.name,note:'Cancelled by customer'});toast('Request cancelled','secondary');await refresh()}});
  if(a==='confirm')modal({title:'Confirm service',body:`<p>Confirm that the problem for <strong>${esc(id)}</strong> was fixed?</p>`,ok:'Confirm',okClass:'btn-success',onOk:async()=>{await moveReq(id,{from:['Completed'],to:'Confirmed',by:S.user.name,note:'Service confirmed by customer'});toast('Service confirmed');await refresh()}});
  if(a==='dispute')modal({title:'Dispute service',body:`<form id="mf" novalidate class="row g-3">${fld('reason','What went wrong?',`<textarea class="form-control" id="reason" name="reason" rows="3" maxlength="300" placeholder="Describe the problem (min 10 characters)"></textarea>`)}</form>`,ok:'Submit dispute',okClass:'btn-warning',onOk:async()=>{const f=$('#mf');if(!validate(f,{reason:v=>v.length<10?'Please describe the problem (min 10 characters)':''}))return false;
   await moveReq(id,{from:['Completed','Failed'],to:'Disputed',by:S.user.name,note:f.reason.value.trim(),extra:{disputeReason:f.reason.value.trim()}});toast('Dispute sent to your Area Verifier','warning');await refresh()}});
  if(a==='pay')modal({title:'Pay bill',body:`<p>Pay <strong>${money(b.amount)}</strong> for ${esc(id)} (mock payment).</p>`,ok:'Pay now',onOk:async()=>{await API.patch('requests',id,{payment:'Paid'});toast('Payment received');await refresh()}});
 });
 $('#goReq').onclick=()=>goTab('request');
 document.addEventListener('shown.bs.tab',e=>{if(e.target.dataset.bsTarget==='#p-request'&&mp)mp.map.invalidateSize()});
 try{pick=JSON.parse(sessionStorage.getItem('pg_pick'))}catch{}sessionStorage.removeItem('pg_pick');
 await load();const hadPick=!!pick;renderAll();if(hadPick)goTab('request');
});
