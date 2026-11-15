boot(async()=>{
 const me=Auth.guard('technician');if(!me)return;shell(me);
 let S,flt='active';
 /* A technician only ever loads their OWN jobs */
 const load=async()=>{const[users,shops,units,all]=await Promise.all(['users','shops','units','requests'].map(r=>API.get(r)));S={users,shops,units,jobs:all.filter(b=>b.techId==me.id)}};
 const ACT=['Assigned','Dispatched','Arrived'];
 function render(){
  const list=S.jobs.filter(b=>flt==='active'?ACT.includes(b.status):!ACT.includes(b.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)*(flt==='active'?1:-1));
  $('#hello').textContent=`Hi ${me.name.split(' ')[0]}`;$('#sub').textContent=`${S.jobs.filter(b=>ACT.includes(b.status)).length} active job(s)`;
  $('#jobs').innerHTML=list.map(b=>{const c=S.users.find(u=>u.id==b.customerId),t=S.units.find(x=>x.id==b.unitId);
   return`<div class="col-12 col-md-6 col-xl-4"><article class="card card-soft job-card s-${b.status} h-100"><div class="card-body"><div class="d-flex justify-content-between align-items-start mb-2"><h2 class="h5 mb-0">${esc(b.id)}${b.priority?' <span class="badge text-bg-danger">Priority</span>':''}</h2>${badge(b.status)}</div>
   <p class="fs-5 fw-semibold mb-1"><i class="bi bi-tools"></i> ${esc(svcName(b.service))}</p><p class="mb-1"><i class="bi bi-car-front"></i> ${esc(b.vehicle)} · ${esc(b.vehicleNo)}</p>
   <p class="mb-1"><i class="bi bi-geo-alt"></i> ${esc(b.landmark)}</p><p class="mb-1"><i class="bi bi-truck"></i> ${t?esc(t.plate):'—'} · ${esc(b.date)} ${esc(b.time)}</p>
   <p class="mb-3"><i class="bi bi-person"></i> ${esc(c?.name)} · <a href="tel:${esc(c?.phone)}">${esc(c?.phone)}</a></p>${b.notes?`<p class="small text-muted">Note: ${esc(b.notes)}</p>`:''}${b.failReason?`<p class="small text-danger">Not completed: ${esc(b.failReason)}</p>`:''}
   ${ACT.includes(b.status)?`<a class="btn btn-outline-primary btn-xl w-100 mb-2" target="_blank" rel="noopener" href="${mapsUrl(b.lat,b.lng)}"><i class="bi bi-cursor"></i> Navigate to customer</a>`:''}
   ${b.status==='Assigned'?'<div class="alert alert-secondary py-2 mb-0">Wait for the shop operator to dispatch your team.</div>':''}
   ${b.status==='Dispatched'?`<div class="d-grid gap-2"><button class="btn btn-primary btn-xl" data-act="arrived" data-id="${esc(b.id)}"><i class="bi bi-geo-alt-fill"></i> I have arrived</button><button class="btn btn-outline-danger btn-xl" data-act="failed" data-id="${esc(b.id)}">Can't complete</button></div>`:''}
   ${b.status==='Arrived'?`<div class="d-grid gap-2"><button class="btn btn-success btn-xl" data-act="done" data-id="${esc(b.id)}"><i class="bi bi-check2-circle"></i> Problem fixed</button><button class="btn btn-outline-danger btn-xl" data-act="failed" data-id="${esc(b.id)}">Can't complete</button></div>`:''}</div></article></div>`}).join('')||`<div class="col-12"><div class="card card-soft"><div class="card-body text-center text-muted py-5"><i class="bi bi-wrench fs-1"></i><p class="mb-0 mt-2">${flt==='active'?'No active jobs assigned to you.':'No completed jobs yet.'}</p></div></div></div>`}
 const refresh=async()=>{await load();render()};
 $$('input[name=flt]').forEach(r=>r.onchange=()=>{flt=r.value;render()});
 $('#app').addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id;
  if(a==='arrived')modal({title:'Confirm arrival',body:`<p>Mark <strong>${esc(id)}</strong> as arrived at the customer's location?</p>`,ok:'Yes, arrived',onOk:async()=>{await moveReq(id,{from:['Dispatched'],to:'Arrived',by:me.name,note:'Technician arrived'});toast('Marked as arrived');await refresh()}});
  if(a==='done')modal({title:'Confirm completion',body:`<p>Is the problem for <strong>${esc(id)}</strong> fixed?</p>`,ok:'Yes, fixed',okClass:'btn-success',onOk:async()=>{await moveReq(id,{from:['Arrived'],to:'Completed',by:me.name,note:'Problem fixed'});toast('Job completed');await refresh()}});
  if(a==='failed')modal({title:'Could not complete',body:`<form id="mf" novalidate class="row g-3">${fld('reason','Reason',`<select class="form-select form-select-lg" id="reason" name="reason"><option value="">Select reason</option>${CFG.REASONS.map(r=>`<option>${r}</option>`).join('')}</select>`)}${fld('detail','Details',`<textarea class="form-control" id="detail" name="detail" rows="2" maxlength="150"></textarea>`)}</form>`,ok:'Report',okClass:'btn-danger',onOk:async()=>{const f=$('#mf');
   if(!validate(f,{reason:v=>v?'':'Select a reason',detail:(v,fm)=>fm.reason.value==='Other'&&v.length<5?'Please explain (min 5 characters)':''}))return false;
   const r=f.reason.value+(f.detail.value.trim()?' – '+f.detail.value.trim():'');await moveReq(id,{from:['Dispatched','Arrived'],to:'Failed',by:me.name,note:r,extra:{failReason:r}});toast('Reported','warning');await refresh()}});
 });
 await load();render();
});
