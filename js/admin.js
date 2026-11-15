boot(async()=>{
 const me=Auth.guard('admin');if(!me)return;shell(me);
 const D={},R=['users','areas','shops','units','requests','rates'];let cur=null;
 const load=async()=>{const a=await Promise.all(R.map(r=>API.get(r)));R.forEach((r,i)=>D[r]=a[i])};
 const opt=(list,lab)=>list.map(x=>[x.id,lab(x)]),none=[['','— none —']];
 const an=id=>D.areas.find(z=>z.id==id)?.name||'—',sn=id=>D.shops.find(h=>h.id==id)?.name||'—',nm=id=>D.users.find(u=>u.id==id)?.name||'—';
 const ENT={
  areas:{label:'Area',fields:[{k:'name',label:'Area name',req:1},{k:'city',label:'City',req:1}],cols:[{label:'Name',k:'name',sort:1},{label:'City',k:'city',sort:1}]},
  shops:{label:'Shop',fields:[{k:'name',label:'Shop name',req:1,col:'col-12',v:v=>v.length<3?'Min 3 characters':''},{k:'phone',label:'WhatsApp number',req:1,rx:RX.wa,msg:'Format: 923001234567',v:v=>D.shops.some(s=>s.phone===v&&s.id!=cur)?'Number already used':''},{k:'areaId',label:'Area',type:'select',req:1,opts:()=>[['','Select area'],...opt(D.areas,z=>z.name)]},{k:'area',label:'Street / landmark',req:1},{k:'capacity',label:'Max jobs per day',type:'number',min:1,req:1},
   {k:'lat',label:'Latitude',type:'number',step:'any',req:1,min:24,v:v=>+v>25.7?'Latitude must be 24–25.7 (Karachi)':''},{k:'lng',label:'Longitude',type:'number',step:'any',req:1,min:66,v:v=>+v>68?'Longitude must be 66–68 (Karachi)':''},
   {k:'is247',label:'Hours',type:'select',bool:1,opts:()=>[[true,'Open 24/7'],[false,'Fixed hours']]},{k:'status',label:'Status',type:'select',opts:()=>['Active','Unavailable','Pending','Rejected'].map(x=>[x,x])},
   {k:'open',label:'Opens',type:'time',v:(v,f)=>f.elements.is247.value==='false'&&!v?'Required for fixed hours':''},{k:'close',label:'Closes',type:'time',v:(v,f)=>f.elements.is247.value==='false'&&(!v||v<=f.elements.open.value)?'Closing must be after opening':''},
   {k:'vehicles',label:'Vehicles',type:'multi',str:1,req:1,opts:()=>CFG.VEHICLES.map(x=>[x,x])},{k:'services',label:'Services',type:'multi',str:1,req:1,opts:()=>CFG.SERVICES.map(x=>[x,svcName(x)])}],
   cols:[{label:'Name',k:'name',sort:1},{label:'Area',val:s=>an(s.areaId),sort:1},{label:'Hours',val:s=>hours(s)},{label:'Capacity',k:'capacity',sort:1},{label:'Rating',k:'rating',sort:1},{label:'Status',k:'status',render:s=>badge(s.status)}]},
  units:{label:'Unit',fields:[{k:'plate',label:'Number plate',req:1,rx:RX.plate,msg:'Format: KHI-1001',v:v=>D.units.some(t=>t.plate.toLowerCase()===v.toLowerCase()&&t.id!=cur)?'Plate already registered':''},{k:'vehicle',label:'Vehicle type',type:'select',req:1,opts:()=>CFG.VEHICLES.map(x=>[x,x])},{k:'shopId',label:'Shop',type:'select',req:1,opts:()=>[['','Select shop'],...opt(D.shops,h=>h.name)]},{k:'status',label:'Status',type:'select',opts:()=>[['Available','Available'],['Unavailable','Unavailable']]}],
   cols:[{label:'Plate',k:'plate',sort:1},{label:'Vehicle',k:'vehicle',sort:1},{label:'Shop',val:t=>sn(t.shopId),sort:1},{label:'Status',k:'status',render:t=>badge(t.status)}]},
  rates:{label:'Rate',noAdd:1,noDel:1,fields:[{k:'standard',label:'Standard rate (Rs)',type:'number',min:1,req:1},{k:'concession',label:'Concession rate (Rs)',type:'number',min:1,req:1,v:(v,f)=>+v>=+f.elements.standard.value?'Concession must be lower than standard':''}],
   cols:[{label:'Problem',val:r=>svcName(r.service),sort:1},{label:'Vehicle',k:'vehicle',sort:1},{label:'Standard',k:'standard',render:r=>money(r.standard)},{label:'Concession',k:'concession',render:r=>money(r.concession)}]},
  users:{label:'User',fields:[{k:'name',label:'Full name',req:1,v:v=>v.length<3?'Min 3 characters':''},{k:'email',label:'Email',req:1,rx:RX.email,msg:'Enter a valid email',v:v=>D.users.some(u=>u.email.toLowerCase()===v.toLowerCase()&&u.id!=cur)?'Email already used':''},{k:'role',label:'Role',type:'select',req:1,opts:()=>Object.entries(ROLE_LABEL)},{k:'phone',label:'Phone',req:1,rx:/^(03\d{2}-?\d{7}|92\d{10})$/,msg:'Format: 0300-1234567'},
   {k:'areaId',label:'Area (customer / verifier)',type:'select',opts:()=>[...none,...opt(D.areas,z=>z.name)],v:(v,f)=>['customer','officer'].includes(f.elements.role.value)&&!v?'Area is required for this role':''},
   {k:'shopId',label:'Shop (operator / technician)',type:'select',opts:()=>[...none,...opt(D.shops,h=>h.name)],v:(v,f)=>['operator','technician'].includes(f.elements.role.value)&&!v?'Shop is required for this role':''},
   {k:'password',label:'Password',type:'password',v:v=>(!cur&&v.length<6)||(v&&v.length<6)?'Min 6 characters (blank keeps current when editing)':''},{k:'active',label:'Account',type:'select',bool:1,opts:()=>[[true,'Active'],[false,'Disabled']]}],
   cols:[{label:'Name',k:'name',sort:1},{label:'Email',k:'email',sort:1},{label:'Role',val:u=>ROLE_LABEL[u.role],sort:1},{label:'Area / Shop',val:u=>u.shopId?sn(u.shopId):u.areaId?an(u.areaId):'—'},{label:'Account',val:u=>u.active===false?'Disabled':'Active',render:u=>u.active===false?'<span class="badge rounded-pill text-bg-danger">Disabled</span>':badge('Active')}]}};
 const tables={};
 const field=(f,row)=>{const v=row?row[f.k]:'',id='f_'+f.k;let c;
  if(f.type==='select'||f.type==='multi')c=`<select class="form-select" id="${id}" name="${f.k}" ${f.type==='multi'?'multiple size="3"':''}>${f.opts().map(([val,l])=>`<option value="${esc(val)}" ${(f.type==='multi'?(v||[]).includes(val):row&&v!==null&&v!==undefined&&String(v)===String(val))?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  else c=`<input class="form-control" id="${id}" name="${f.k}" type="${f.type||'text'}" value="${f.type==='password'?'':esc(v)}" ${f.min!=null?`min="${f.min}"`:''} ${f.step?`step="${f.step}"`:''} autocomplete="off">`;
  return fld(id,f.label+(f.req?' *':''),c,f.col||'col-md-6')};
 const read=(form,fields)=>{const o={};fields.forEach(f=>{const el=form.elements[f.k],v=el.value.trim();
  if(f.type==='multi')o[f.k]=[...el.selectedOptions].map(x=>f.str?x.value:+x.value);else if(f.type==='number')o[f.k]=+v;else if(f.bool)o[f.k]=v==='true';else if(f.type==='select')o[f.k]=v===''?null:(!isNaN(v)?+v:v);else o[f.k]=v});return o};
 const rulesFor=fields=>Object.fromEntries(fields.map(f=>[f.k,(v,form)=>{
  if(f.type==='multi')return form.elements[f.k].selectedOptions.length?'':'Pick at least one';
  if(f.req&&!v)return'Required';if(f.type==='number'&&(isNaN(v)||(f.min!=null&&+v<f.min)))return`Must be a number ≥ ${f.min}`;if(f.rx&&v&&!f.rx.test(v))return f.msg;return f.v?f.v(v,form):''}]));
 const block=(key,r)=>{const b=D.requests,open=x=>OPEN.includes(x.status);
  if(key==='areas'&&(D.shops.some(h=>h.areaId==r.id)||D.users.some(u=>u.areaId==r.id)))return'Area is used by shops or users.';
  if(key==='shops'&&(D.units.some(t=>t.shopId==r.id)||D.users.some(u=>u.shopId==r.id)||b.some(x=>x.shopId==r.id&&open(x))))return'Shop still has units, staff or open requests.';
  if(key==='units'&&b.some(x=>x.unitId==r.id&&open(x)))return'Unit is on an open job.';
  if(key==='users'&&(r.id==me.id||b.some(x=>(x.customerId==r.id||x.techId==r.id)&&open(x))))return r.id==me.id?'You cannot delete your own account.':'User has open requests/jobs.';return''};
 function openForm(key,row){cur=row?row.id:null;const E=ENT[key];
  modal({title:(row?'Edit ':'Add ')+E.label.toLowerCase(),size:'lg',ok:'Save',body:`<form id="mf" class="row g-3" novalidate>${E.fields.map(f=>field(f,row)).join('')}</form>`,onOk:async()=>{const f=$('#mf');if(!validate(f,rulesFor(E.fields)))return false;
   const o=read(f,E.fields);if(key==='users'&&row&&!o.password)delete o.password;if(key==='units')o.plate=o.plate.toUpperCase();
   if(key==='shops'&&o.is247){o.open='00:00';o.close='23:59'}
   if(row)await API.patch(key,row.id,o);else await API.add(key,key==='users'?{...o,concessionStatus:'none'}:key==='shops'?{rating:0,...o}:o);
   await load();renderTab(key);toast(E.label+' saved')}})}
 function renderTab(key){const E=ENT[key],pane=$('#p-'+key);
  if(!tables[key]){pane.innerHTML=`<div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">${E.label}s</h2>${E.noAdd?'':`<button class="btn btn-primary" data-act="add" data-k="${key}"><i class="bi bi-plus-lg"></i> Add ${E.label.toLowerCase()}</button>`}</div><div class="card card-soft"><div class="card-body"><div id="tb-${key}"></div></div></div>`;
   tables[key]=makeTable($('#tb-'+key),{cols:[...E.cols,{label:'Actions',render:r=>`<div class="d-flex gap-1 justify-content-end"><button class="btn btn-sm btn-outline-primary" data-act="edit" data-k="${key}" data-id="${r.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>${E.noDel?'':`<button class="btn btn-sm btn-outline-danger" data-act="del" data-k="${key}" data-id="${r.id}" aria-label="Delete"><i class="bi bi-trash"></i></button>`}</div>`}],search:E.cols.filter(c=>c.k||c.val).map(c=>c.k||c.val),size:8})}
  tables[key].set(D[key])}
 let bt;function renderRequests(){const pane=$('#p-requests');
  if(!bt){pane.innerHTML=`<div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">All requests</h2><button class="btn btn-outline-primary" data-act="csv"><i class="bi bi-download"></i> Export CSV</button></div><div class="card card-soft"><div class="card-body"><div id="tb-rq"></div></div></div>`;
   bt=makeTable($('#tb-rq'),{search:['id','vehicle','type',b=>nm(b.customerId),b=>sn(b.shopId)],filter:{label:'statuses',key:'status',options:ALL_STATUS},sortKey:1,sortDir:-1,
    cols:[{label:'ID',k:'id',sort:1},{label:'When',val:b=>b.date+' '+b.time,sort:1},{label:'Customer',val:b=>nm(b.customerId),sort:1},{label:'Shop',val:b=>sn(b.shopId)},{label:'Problem',val:b=>svcName(b.service)},{label:'Type',k:'type'},{label:'Status',k:'status',sort:1,render:b=>badge(b.status)},{label:'Charge',k:'amount',sort:1,render:b=>money(b.amount)},{label:'View',render:b=>`<button class="btn btn-sm btn-outline-primary" data-act="view" data-id="${esc(b.id)}" aria-label="View ${esc(b.id)}"><i class="bi bi-eye"></i></button>`}]})}
  bt.set(D.requests)}
 const bars=(m,cls='bg-primary')=>{const mx=Math.max(1,...Object.values(m));return Object.entries(m).map(([k,v])=>`<div class="bar-row"><span class="text-truncate" title="${esc(k)}">${esc(k)}</span><div class="progress" role="progressbar" aria-label="${esc(k)}" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="${mx}"><div class="progress-bar ${cls}" style="width:${v/mx*100}%"></div></div><b>${v}</b></div>`).join('')||'<p class="text-muted">No data</p>'};
 function renderReports(){const b=D.requests,live=b.filter(x=>!DEAD.includes(x.status)),sum=a=>a.reduce((s,x)=>s+x.amount,0),cnt=(a,f)=>a.reduce((m,x)=>(m[f(x)]=(m[f(x)]||0)+1,m),{}),t=today();
  $('#hello').textContent='City overview';$('#sub').textContent=`${me.name} · ${b.length} requests, ${D.shops.filter(s=>s.status==='Active').length} active shops, ${D.areas.length} areas`;
  $('#p-reports').innerHTML=`<div class="row g-3 mb-4">${statCard('journal-text','Total requests',b.length)}${statCard('cash-coin','Revenue collected',money(sum(b.filter(x=>x.payment==='Paid'))),'success')}${statCard('hourglass-split','Outstanding bills',money(sum(live.filter(x=>x.payment==='Unpaid'&&DONE.includes(x.status)))),'warning')}${statCard('exclamation-triangle','Open disputes',b.filter(x=>x.status==='Disputed').length,'danger')}</div>
  <div class="row g-3"><div class="col-lg-6"><div class="card card-soft h-100"><div class="card-body"><h2 class="h6">Requests by status</h2>${bars(cnt(b,x=>x.status))}</div></div></div>
  <div class="col-lg-6"><div class="card card-soft h-100"><div class="card-body"><h2 class="h6">Shop capacity used today (${t})</h2>${D.shops.filter(s=>s.status==='Active'||s.status==='Unavailable').map(h=>{const u=Rules.used(b,h.id,t),p=Math.min(100,Math.round(u/h.capacity*100));return`<div class="mb-3"><div class="d-flex justify-content-between small"><span>${esc(h.name)} ${h.status!=='Active'?badge(h.status):''}</span><span>${u} / ${h.capacity} jobs</span></div><div class="progress" role="progressbar" aria-label="${esc(h.name)} capacity" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${p>=90?'bg-danger':p>=70?'bg-warning':'bg-success'}" style="width:${p}%"></div></div></div>`}).join('')}</div></div></div>
  <div class="col-lg-4"><div class="card card-soft h-100"><div class="card-body"><h2 class="h6">Standard vs concession</h2>${bars(cnt(live,x=>x.type),'bg-info')}</div></div></div>
  <div class="col-lg-4"><div class="card card-soft h-100"><div class="card-body"><h2 class="h6">Requests per area</h2>${bars(cnt(live,x=>an(x.areaId)),'bg-success')}</div></div></div>
  <div class="col-lg-4"><div class="card card-soft h-100"><div class="card-body"><h2 class="h6">Requests by problem</h2>${bars(cnt(live,x=>svcName(x.service)),'bg-warning')}</div></div></div></div>`}
 const render=()=>{renderReports();renderRequests();Object.keys(ENT).forEach(renderTab)};
 $('#app').addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,k=el.dataset.k,id=el.dataset.id;
  if(a==='add')openForm(k);if(a==='edit')openForm(k,D[k].find(r=>r.id==id));
  if(a==='del'){const r=D[k].find(x=>x.id==id),why=block(k,r);if(why)return toast(why,'warning');
   modal({title:'Delete '+ENT[k].label.toLowerCase()+'?',body:'<p>This cannot be undone.</p>',ok:'Delete',okClass:'btn-danger',onOk:async()=>{await API.del(k,id);await load();renderTab(k);toast('Deleted','secondary')}})}
  if(a==='view')modal({title:'Request '+id,body:detailHtml(D.requests.find(x=>x.id==id),D,{readOnly:true}),size:'lg'});
  if(a==='csv')exportCsv('puncturego-requests.csv',D.requests)});
 await load();render();
});
