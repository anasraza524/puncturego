const PAGE=document.body.dataset.page;
boot(async()=>{
 if(PAGE==='login'){
  const users=await API.get('users');
  $('#demo').innerHTML=Object.keys(ROLE_LABEL).map(r=>{const u=users.find(x=>x.role===r);return u?`<button type="button" class="btn btn-outline-primary demo-btn" data-e="${esc(u.email)}">${ROLE_LABEL[r]}</button>`:''}).join('');
  $('#demo').onclick=e=>{const b=e.target.closest('[data-e]');if(b){$('#email').value=b.dataset.e;$('#password').value='Pass@123';$('#email').focus()}};
  $('#loginForm').onsubmit=e=>{e.preventDefault();const f=e.target;
   if(!validate(f,{email:v=>RX.email.test(v)?'':'Enter a valid email address',password:v=>v?'':'Password is required'}))return;
   const u=users.find(x=>x.email.toLowerCase()===f.email.value.trim().toLowerCase()&&x.password===f.password.value);
   if(!u||u.active===false){$('#loginAlert').innerHTML='<div class="alert alert-danger py-2" role="alert">Invalid credentials, or the account is disabled.</div>';return}
   Auth.set(u);location.href=HOME[u.role]};
 }
 if(PAGE==='register'){
  const areas=await API.get('areas');
  $('#area').innerHTML='<option value="">Select your area</option>'+areas.map(z=>`<option value="${z.id}">${esc(z.name)}</option>`).join('');
  $('#cnic').oninput=e=>{const d=e.target.value.replace(/\D/g,'').slice(0,13);e.target.value=[d.slice(0,5),d.slice(5,12),d.slice(12)].filter(Boolean).join('-')};
  $('#regForm').onsubmit=async e=>{e.preventDefault();const f=e.target,users=await API.get('users');
   const dup=(k,v)=>users.some(u=>String(u[k]||'').toLowerCase()===v.toLowerCase());
   if(!validate(f,{name:v=>v.length<3?'Enter your full name (min 3 characters)':/\d/.test(v)?'Name cannot contain digits':'',
    cnic:v=>!RX.cnic.test(v)?'Format: 42101-1234567-1':dup('cnic',v)?'This CNIC is already registered':'',
    phone:v=>RX.phone.test(v)?'':'Format: 0300-1234567',
    email:v=>!RX.email.test(v)?'Enter a valid email':dup('email',v)?'This email is already registered':'',
    area:v=>v?'':'Select your area',address:v=>v.length<10?'Enter a full address (min 10 characters)':'',
    password:v=>v.length<8||!/[A-Za-z]/.test(v)||!/\d/.test(v)?'Min 8 characters with a letter and a number':'',
    confirm:v=>v!==f.password.value?'Passwords do not match':''}))return;
   const u=await API.add('users',{name:f.name.value.trim(),cnic:f.cnic.value,phone:f.phone.value.trim(),email:f.email.value.trim(),password:f.password.value,role:'customer',active:true,areaId:+f.area.value,address:f.address.value.trim(),concessionStatus:'none'});
   Auth.set(u);toast('Account created');setTimeout(()=>location.href='customer.html',700)};
 }
 if(PAGE==='shop'){
  const[areas,shops,users]=await Promise.all(['areas','shops','users'].map(r=>API.get(r)));
  const f=$('#shopForm');let pinned=false;
  $('#area').innerHTML='<option value="">Select area</option>'+areas.map(z=>`<option value="${z.id}">${esc(z.name)}</option>`).join('');
  $('#vehicles').innerHTML=optList(CFG.VEHICLES);$('#services').innerHTML=optList(CFG.SERVICES);
  const mp=mapPicker('map',{lat:CFG.DEFAULT[0],lng:CFG.DEFAULT[1],onMove:(a,b)=>{pinned=true;$('#pin').value=a.toFixed(5)+','+b.toFixed(5);$('#pin').classList.remove('is-invalid');$('#pinTxt').textContent=`Pin set at ${a.toFixed(5)}, ${b.toFixed(5)}`}});
  $('#gpsBtn').onclick=()=>{$('#pinTxt').textContent='Locking GPS…';gps((a,b,acc)=>{mp.set(a,b,true);$('#pinTxt').textContent+=` · accuracy ~${acc} m`},()=>toast('Could not get GPS. Tap the map to place the pin.','warning'))};
  const sync=()=>{const fx=f.elements.is247.value==='true';f.elements.open.disabled=fx;f.elements.close.disabled=fx};f.elements.is247.onchange=sync;sync();
  const sel=n=>[...f.elements[n].selectedOptions].map(o=>o.value);
  f.onsubmit=async e=>{e.preventDefault();const fx=f.elements.is247.value==='true';
   const dup=(l,k,v)=>l.some(u=>String(u[k]||'').toLowerCase()===v.toLowerCase());
   if(!validate(f,{owner:v=>v.length<3?'Enter the owner name (min 3 characters)':/\d/.test(v)?'Name cannot contain digits':'',
    email:v=>!RX.email.test(v)?'Enter a valid email':dup(users,'email',v)?'This email is already registered':'',
    phone:v=>!RX.wa.test(v)?'Use international format without + (e.g. 923001234567)':dup(shops,'phone',v)?'This number is already registered to a shop':'',
    password:v=>v.length<8||!/[A-Za-z]/.test(v)||!/\d/.test(v)?'Min 8 characters with a letter and a number':'',confirm:v=>v!==f.elements.password.value?'Passwords do not match':'',
    shopName:v=>v.length<3?'Enter the shop name (min 3 characters)':dup(shops,'name',v)?'A shop with this name already exists':'',
    area:v=>v?'':'Select an area',street:v=>v.length<3?'Enter a street or landmark':'',
    vehicles:()=>sel('vehicles').length?'':'Select at least one vehicle type',services:()=>sel('services').length?'':'Select at least one service',
    open:v=>fx||v?'':'Opening time required',close:(v,fm)=>fx?'':!v?'Closing time required':v<=fm.open.value?'Closing time must be after opening':'',
    capacity:v=>!(+v>=1&&+v<=200)?'Enter a number between 1 and 200':'',pin:()=>pinned?'':'Place the pin on the map (tap the map or use GPS)'}))return;
   const[lat,lng]=mp.pos();
   const s=await API.add('shops',{name:f.elements.shopName.value.trim(),area:f.elements.street.value.trim(),areaId:+f.elements.area.value,lat:+lat.toFixed(5),lng:+lng.toFixed(5),phone:f.elements.phone.value,vehicles:sel('vehicles'),services:sel('services'),is247:fx,open:fx?'00:00':f.elements.open.value,close:fx?'23:59':f.elements.close.value,rating:0,capacity:+f.elements.capacity.value,status:'Pending'});
   const u=await API.add('users',{name:f.elements.owner.value.trim(),email:f.elements.email.value.trim(),password:f.elements.password.value,role:'operator',active:true,phone:f.elements.phone.value,shopId:s.id});
   Auth.set(u);toast('Shop submitted for verification');setTimeout(()=>location.href='operator.html',900)};
 }
});
