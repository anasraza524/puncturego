boot(async()=>{
 const[shopsAll,units,reqs,rates,areas]=await Promise.all(['shops','units','requests','rates','areas'].map(r=>API.get(r)));
 const shops=shopsAll.filter(s=>s.status==='Active'),me=Auth.user();
 let pos={lat:CFG.DEFAULT[0],lng:CFG.DEFAULT[1]},ids={},layer;
 $('#fVehicle').innerHTML='<option value="">All vehicles</option>'+CFG.VEHICLES.map(v=>`<option>${v}</option>`).join('');
 $('#fService').innerHTML='<option value="">All issues</option>'+CFG.SERVICES.map(s=>`<option value="${s}">${svcName(s)}</option>`).join('');
 $('#stats').innerHTML=[['shop','Verified shops',shops.length],['truck-front','Service units ready',units.filter(u=>u.status==='Available').length],['check2-circle','Jobs completed',reqs.filter(r=>DONE.includes(r.status)).length],['geo-alt','Areas covered',areas.length]].map(([i,l,v])=>`<div class="col-6 col-md-3"><div class="glass p-2 text-center"><i class="bi bi-${i}"></i> <strong class="fs-5">${v}</strong><div class="small">${l}</div></div></div>`).join('');
 if(me)$('#navAuth').insertAdjacentHTML('afterbegin',`<a class="btn btn-sm btn-light" href="${HOME[me.role]}">Dashboard</a>`);
 const map=L.map('map').setView([pos.lat,pos.lng],13);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
 layer=L.layerGroup().addTo(map);
 const pin=L.marker([pos.lat,pos.lng],{icon:L.divIcon({html:'<div class="pin" role="img" aria-label="Your location"></div>',className:'',iconSize:[22,22],iconAnchor:[11,11]}),draggable:true,title:'You are here – drag to adjust'}).addTo(map).bindTooltip('You are here',{permanent:false});
 const move=(a,b,zoom)=>{pos={lat:a,lng:b};pin.setLatLng([a,b]);if(zoom)map.setView([a,b],15);render()};
 pin.on('dragend',()=>{const p=pin.getLatLng();$('#locStatus').textContent=`📍 Pin adjusted (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`;move(p.lat,p.lng)});
 map.on('click',e=>{$('#locStatus').textContent=`📍 Pin moved (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;move(e.latlng.lat,e.latlng.lng)});
 $('#gpsBtn').onclick=()=>{$('#locStatus').textContent='⏳ Locking high-accuracy GPS…';gps((a,b,acc)=>{$('#locStatus').textContent=`✅ GPS locked (${a.toFixed(5)}, ${b.toFixed(5)}) · accuracy ~${acc} m`;move(a,b,true)},()=>{$('#locStatus').textContent='⚠️ Could not lock GPS (allow location access, use HTTPS/localhost). Tap the map to set the pin.';render()})};
 const minPrice=s=>Math.min(...s.vehicles.flatMap(v=>s.services.map(x=>priceOf(rates,v,x,'standard'))).filter(Boolean),Infinity);
 const filtered=()=>{const r=+$('#fRadius').value,v=$('#fVehicle').value,sv=$('#fService').value,q=$('#fSearch').value.toLowerCase(),o=$('#fOpen').checked;
  const l=shops.map(s=>({...s,d:hav(pos.lat,pos.lng,s.lat,s.lng)})).filter(s=>(!r||s.d<=r)&&Rules.supports(s,v,sv)&&(!o||isOpen(s))&&(!q||(s.name+' '+s.area).toLowerCase().includes(q)));
  const k=$('#fSort').value;return l.sort((a,b)=>k==='rating'?b.rating-a.rating:k==='price'?minPrice(a)-minPrice(b):a.d-b.d)};
 function render(){
  const l=filtered(),v=$('#fVehicle').value,sv=$('#fService').value;layer.clearLayers();ids={};
  $('#count').textContent=`${l.length} mechanic${l.length==1?'':'s'} found`;
  $('#list').innerHTML=l.map(s=>{
   const chips=s.vehicles.filter(x=>!v||x===v).flatMap(x=>s.services.filter(y=>!sv||y===sv).map(y=>`${x} ${svcName(y).toLowerCase()}: ${money(priceOf(rates,x,y,'standard'))}`)).slice(0,4);
   return`<article class="card card-soft shop-card" id="shop-${s.id}"><div class="card-body"><div class="d-flex justify-content-between align-items-start gap-2"><h2 class="h5 mb-1">${esc(s.name)}</h2><span class="badge text-bg-${isOpen(s)?'success':'secondary'}">${s.is247?'Open 24/7':isOpen(s)?'Open':'Closed'}</span></div>
   <p class="text-muted small mb-2"><i class="bi bi-geo-alt"></i> ${esc(s.area)} · <strong>${km(s.d)} away</strong> · <i class="bi bi-star-fill text-warning"></i> ${s.rating.toFixed(1)}</p>
   <div class="mb-1">${s.vehicles.map(x=>`<span class="chip"><i class="bi bi-car-front"></i> ${x}</span>`).join('')}${s.services.map(x=>`<span class="chip"><i class="bi bi-tools"></i> ${esc(svcName(x))}</span>`).join('')}</div>
   <p class="small mb-3"><i class="bi bi-cash-coin"></i> <strong>Standard rates:</strong> ${chips.map(esc).join(' | ')||'—'}</p>
   <div class="d-flex flex-wrap gap-2"><a class="btn btn-outline-primary" href="tel:+${s.phone}"><i class="bi bi-telephone"></i> Call now</a><a class="btn btn-success" target="_blank" rel="noopener" href="${waLink(s,pos.lat,pos.lng)}"><i class="bi bi-whatsapp"></i> Send live location</a><button class="btn btn-primary" data-req="${s.id}"><i class="bi bi-life-preserver"></i> Request help</button></div></div></article>`}).join('')||'<div class="card card-soft"><div class="card-body text-center text-muted py-5"><i class="bi bi-search fs-1"></i><p class="mb-0 mt-2">No mechanic matches these filters. Try a wider distance or fewer filters.</p></div></div>';
  l.forEach(s=>{const m=L.circleMarker([s.lat,s.lng],{radius:9,color:'#fff',weight:2,fillColor:'#0d6efd',fillOpacity:.95}).addTo(layer).bindPopup(`<strong>${esc(s.name)}</strong><br>${km(s.d)} away`);
   m.on('click',()=>{const el=$('#shop-'+s.id);el?.scrollIntoView({behavior:'smooth',block:'center'});$$('.shop-card').forEach(c=>c.classList.remove('hl'));el?.classList.add('hl')})});
 }
 ['fRadius','fVehicle','fService','fSort','fOpen'].forEach(i=>$('#'+i).onchange=render);$('#fSearch').oninput=render;
 $('#list').addEventListener('click',e=>{const b=e.target.closest('[data-req]');if(!b)return;
  sessionStorage.setItem('pg_pick',JSON.stringify({shopId:+b.dataset.req,lat:pos.lat,lng:pos.lng,vehicle:$('#fVehicle').value,service:$('#fService').value}));
  if(!me)location.href='login.html';else if(me.role==='customer')location.href='customer.html';else toast('Only customer accounts can request help.','warning')});
 render();
});
