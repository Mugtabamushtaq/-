/* PWA Shop App
   - Uses localStorage for simplicity (indexedDB can be added later)
   - Sync via GitHub Gist using a Personal Access Token (gist scope)
   - RTL Arabic UI, auto theme by device
*/
const STORAGE_KEY = 'shop_app_v1';
const GIST_KEY = 'shop_app_gist_id';

let state = {
  products: [],
  shops: [],
  invoices: []
};

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw) state = JSON.parse(raw);
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setStatus(text){ document.getElementById('status').textContent = 'الوضع: ' + text; }
function setLastSync(t){ document.getElementById('lastSync').textContent = 'آخر مزامنة: ' + (t||'-'); }

function uid(){ return 'id_'+Math.random().toString(36).slice(2,9); }

// Routing and UI
function $(s){ return document.querySelector(s); }
function $all(s){ return document.querySelectorAll(s); }

function render(route){
  const main = $('#main');
  main.innerHTML = '';
  if(route === 'products') renderProducts();
  else if(route === 'shops') renderShops();
  else if(route === 'invoices') renderInvoices();
  else if(route === 'sync') renderSync();
  else if(route === 'settings') renderSettings();
  else renderProducts();
}

function init(){
  loadState();
  // setup header buttons
  $('#btn-menu').onclick = ()=>{ $('#nav').classList.toggle('hidden'); }
  $all('[data-route]').forEach(b => b.onclick = ()=>{ render(b.dataset.route); $('#nav').classList.add('hidden');});
  // default
  render('products');
  // register service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').then(()=>console.log('SW registered'));
  }
  // online/offline
  window.addEventListener('online', ()=>setStatus('متصل'));
  window.addEventListener('offline', ()=>setStatus('أوفلاين'));
  setStatus(navigator.onLine ? 'متصل' : 'أوفلاين');
  setLastSync(localStorage.getItem('lastSync'));
}

// Products
function renderProducts(){
  const tpl = document.getElementById('tpl-products').content.cloneNode(true);
  $('#main').appendChild(tpl);
  const list = $('#productsList');
  function refreshList(){
    list.innerHTML = '';
    state.products.forEach(p=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escape(p.name)}</strong><div class="small">السعر: ${p.price}</div></div>
                      <div>
                        <button data-id="${p.id}" class="btnEdit">تعديل</button>
                        <button data-id="${p.id}" class="btnDel">حذف</button>
                      </div>`;
      list.appendChild(li);
    });
    $all('.btnDel').forEach(b=>b.onclick=async e=>{
      const id = e.target.dataset.id;
      if(confirm('تأكيد حذف المادة؟')) {
        state.products = state.products.filter(x=>x.id!==id);
        saveState(); refreshList();
      }
    });
    $all('.btnEdit').forEach(b=>b.onclick=async e=>{
      const id = e.target.dataset.id;
      openProductModal(state.products.find(x=>x.id===id));
    });
  }
  refreshList();
  $('#btnAddProduct').onclick = ()=> openProductModal();
  $('#searchProduct').oninput = (e)=>{
    const q = e.target.value.trim().toLowerCase();
    const items = state.products.filter(p=>p.name.toLowerCase().includes(q));
    list.innerHTML=''; items.forEach(p=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escape(p.name)}</strong><div class="small">السعر: ${p.price}</div></div>
                      <div>
                        <button data-id="${p.id}" class="btnEdit">تعديل</button>
                        <button data-id="${p.id}" class="btnDel">حذف</button>
                      </div>`;
      list.appendChild(li);
    });
    $all('.btnDel').forEach(b=>b.onclick=async e=>{
      const id = e.target.dataset.id;
      if(confirm('تأكيد حذف المادة؟')) {
        state.products = state.products.filter(x=>x.id!==id);
        saveState(); render('products');
      }
    });
    $all('.btnEdit').forEach(b=>b.onclick=async e=>{
      const id = e.target.dataset.id;
      openProductModal(state.products.find(x=>x.id===id));
    });
  };
}

function openProductModal(product){
  const modal = $('#modal'); const content = $('#modalContent');
  modal.classList.remove('hidden'); content.innerHTML='';
  const name = document.createElement('input'); name.value = product?product.name:''; name.placeholder='اسم المادة';
  const price = document.createElement('input'); price.value = product?product.price:''; price.placeholder='السعر'; price.type='number';
  const notes = document.createElement('input'); notes.value = product?product.notes:''; notes.placeholder='ملاحظات';
  const save = document.createElement('button'); save.textContent='حفظ';
  save.onclick = ()=>{
    if(!name.value.trim()){ alert('اكتب اسم المادة'); return; }
    if(product){
      product.name = name.value.trim(); product.price = parseFloat(price.value)||0; product.notes = notes.value;
    } else {
      state.products.unshift({ id: uid(), name: name.value.trim(), price: parseFloat(price.value)||0, notes: notes.value });
    }
    saveState(); modal.classList.add('hidden'); render('products');
  };
  const body = document.createElement('div');
  body.appendChild(name); body.appendChild(price); body.appendChild(notes); body.appendChild(save);
  content.appendChild(body);
  $('#modalClose').onclick = ()=> modal.classList.add('hidden');
}

// Shops
function renderShops(){
  const tpl = document.getElementById('tpl-shops').content.cloneNode(true);
  $('#main').appendChild(tpl);
  const list = $('#shopsList');
  function refresh(){
    list.innerHTML=''; state.shops.forEach(s=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escape(s.name)}</strong><div class="small">الجوال: ${s.phone||''}</div></div>
                      <div><button data-id="${s.id}" class="btnView">عرض الفواتير</button>
                      <button data-id="${s.id}" class="btnDel">حذف</button></div>`;
      list.appendChild(li);
    });
    $all('.btnDel').forEach(b=>b.onclick=e=>{
      const id = e.target.dataset.id; if(confirm('تأكيد حذف المحل؟')){ state.shops = state.shops.filter(x=>x.id!==id); saveState(); render('shops'); }
    });
    $all('.btnView').forEach(b=>b.onclick=e=>{ const id=e.target.dataset.id; openShopInvoices(id); });
  }
  refresh();
  $('#btnAddShop').onclick = ()=> openShopModal();
  $('#searchShop').oninput = e=>{
    const q = e.target.value.trim().toLowerCase();
    const items = state.shops.filter(s=>s.name.toLowerCase().includes(q));
    list.innerHTML=''; items.forEach(s=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escape(s.name)}</strong><div class="small">الجوال: ${s.phone||''}</div></div>
                      <div><button data-id="${s.id}" class="btnView">عرض الفواتير</button>
                      <button data-id="${s.id}" class="btnDel">حذف</button></div>`;
      list.appendChild(li);
    });
    $all('.btnDel').forEach(b=>b.onclick=e=>{
      const id = e.target.dataset.id; if(confirm('تأكيد حذف المحل؟')){ state.shops = state.shops.filter(x=>x.id!==id); saveState(); render('shops'); }
    });
    $all('.btnView').forEach(b=>b.onclick=e=>{ const id=e.target.dataset.id; openShopInvoices(id); });
  };
}

function openShopModal(shop){
  const modal = $('#modal'); const content = $('#modalContent');
  modal.classList.remove('hidden'); content.innerHTML='';
  const name = document.createElement('input'); name.value = shop?shop.name:''; name.placeholder='اسم المحل';
  const phone = document.createElement('input'); phone.value = shop?shop.phone:''; phone.placeholder='رقم الجوال';
  const save = document.createElement('button'); save.textContent='حفظ';
  save.onclick = ()=>{
    if(!name.value.trim()){ alert('اكتب اسم المحل'); return; }
    if(shop){
      shop.name = name.value.trim(); shop.phone = phone.value;
    } else {
      state.shops.unshift({ id: uid(), name: name.value.trim(), phone: phone.value });
    }
    saveState(); modal.classList.add('hidden'); render('shops');
  };
  const body = document.createElement('div');
  body.appendChild(name); body.appendChild(phone); body.appendChild(save);
  content.appendChild(body);
  $('#modalClose').onclick = ()=> modal.classList.add('hidden');
}

function openShopInvoices(shopId){
  const modal = $('#modal'); const content = $('#modalContent');
  modal.classList.remove('hidden'); content.innerHTML='';
  const shop = state.shops.find(s=>s.id===shopId);
  const title = document.createElement('h3'); title.textContent = 'فواتير ' + shop.name;
  const list = document.createElement('div');
  const items = state.invoices.filter(inv=>inv.shopId===shopId);
  items.forEach(inv=>{
    const el = document.createElement('div');
    el.innerHTML = `<strong>وصل: ${inv.id}</strong> مجموع: ${inv.total} تاريخ: ${inv.date}`;
    list.appendChild(el);
  });
  content.appendChild(title); content.appendChild(list);
  $('#modalClose').onclick = ()=> modal.classList.add('hidden');
}

// Invoices
function renderInvoices(){
  const tpl = document.getElementById('tpl-invoices').content.cloneNode(true);
  $('#main').appendChild(tpl);
  const list = $('#invoicesList');
  function refresh(){
    list.innerHTML=''; state.invoices.forEach(inv=>{
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>وصل ${inv.id}</strong><div class="small">المحل: ${inv.shopName||''} - مجموع: ${inv.total}</div></div>
                      <div><button data-id="${inv.id}" class="btnView">عرض</button>
                      <button data-id="${inv.id}" class="btnDel">حذف</button></div>`;
      list.appendChild(li);
    });
    $all('.btnDel').forEach(b=>b.onclick=e=>{
      const id=e.target.dataset.id; if(confirm('حذف الوصل؟')){ state.invoices = state.invoices.filter(x=>x.id!==id); saveState(); render('invoices'); }
    });
    $all('.btnView').forEach(b=>b.onclick=e=>{
      const id=e.target.dataset.id; openInvoiceModal(id);
    });
  }
  refresh();
  $('#btnNewInvoice').onclick = ()=> openInvoiceModal();
}

function openInvoiceModal(invoice){
  const modal = $('#modal'); const content = $('#modalContent');
  modal.classList.remove('hidden'); content.innerHTML='';
  // if invoice provided -> view/edit, else create
  const shopSel = document.createElement('select');
  state.shops.forEach(s=>{ const o=document.createElement('option'); o.value=s.id; o.textContent=s.name; shopSel.appendChild(o); });
  const itemsDiv = document.createElement('div');
  const addItemBtn = document.createElement('button'); addItemBtn.textContent='اضف مادة';
  addItemBtn.onclick = ()=> {
    const row = document.createElement('div'); row.className='itemRow';
    const prodSel = document.createElement('select');
    state.products.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name + ' - ' + p.price; prodSel.appendChild(o); });
    const qty = document.createElement('input'); qty.type='number'; qty.value='1'; qty.style.width='80px';
    const remove = document.createElement('button'); remove.textContent='حذف';
    remove.onclick = ()=>{ itemsDiv.removeChild(row); updateTotal(); };
    row.appendChild(prodSel); row.appendChild(qty); row.appendChild(remove);
    itemsDiv.appendChild(row);
    updateTotal();
  };
  const totalDiv = document.createElement('div'); totalDiv.className='small';
  function updateTotal(){
    let sum=0;
    itemsDiv.querySelectorAll('.itemRow').forEach(r=>{
      const prodId = r.querySelector('select').value;
      const p = state.products.find(x=>x.id===prodId);
      const q = parseFloat(r.querySelector('input').value) || 0;
      if(p) sum += (p.price||0) * q;
    });
    totalDiv.textContent = 'المجموع: ' + sum;
    return sum;
  }
  const save = document.createElement('button'); save.textContent='حفظ الفاتورة';
  save.onclick = ()=>{
    const shopId = shopSel.value;
    if(!shopId){ alert('اختار محل'); return; }
    const arr = [];
    itemsDiv.querySelectorAll('.itemRow').forEach(r=>{
      const prodId = r.querySelector('select').value;
      const p = state.products.find(x=>x.id===prodId);
      const q = parseFloat(r.querySelector('input').value) || 0;
      arr.push({ productId: prodId, name: p.name, qty: q, price: p.price });
    });
    const total = updateTotal();
    const id = invoice ? invoice.id : uid();
    const date = new Date().toLocaleString();
    if(invoice){
      // update
      const idx = state.invoices.findIndex(x=>x.id===invoice.id);
      state.invoices[idx] = { id, shopId, shopName: state.shops.find(s=>s.id===shopId).name, items: arr, total, date };
    } else {
      state.invoices.unshift({ id, shopId, shopName: state.shops.find(s=>s.id===shopId).name, items: arr, total, date });
    }
    saveState(); modal.classList.add('hidden'); render('invoices');
  };

  // build modal
  content.appendChild(document.createElement('h3')).textContent = invoice ? 'عرض/تعديل فاتورة' : 'إنشاء فاتورة';
  content.appendChild(document.createTextNode('اختار المحل:'));
  content.appendChild(shopSel);
  content.appendChild(addItemBtn);
  content.appendChild(itemsDiv);
  content.appendChild(totalDiv);
  content.appendChild(save);
  // if editing, populate items
  if(invoice){
    shopSel.value = invoice.shopId;
    invoice.items.forEach(it=>{
      const row = document.createElement('div'); row.className='itemRow';
      const prodSel = document.createElement('select');
      state.products.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name + ' - ' + p.price; prodSel.appendChild(o); });
      prodSel.value = it.productId;
      const qty = document.createElement('input'); qty.type='number'; qty.value=it.qty; qty.style.width='80px';
      const remove = document.createElement('button'); remove.textContent='حذف';
      remove.onclick = ()=>{ itemsDiv.removeChild(row); updateTotal(); };
      row.appendChild(prodSel); row.appendChild(qty); row.appendChild(remove);
      itemsDiv.appendChild(row);
    });
    updateTotal();
  }
  $('#modalClose').onclick = ()=> modal.classList.add('hidden');
}

// Sync via GitHub Gist
async function renderSync(){
  const tpl = document.getElementById('tpl-sync').content.cloneNode(true);
  $('#main').appendChild(tpl);
  const inputToken = $('#inputToken');
  const inputGistId = $('#inputGistId');
  const log = $('#syncLog');
  inputToken.value = localStorage.getItem('github_token') || '';
  inputGistId.value = localStorage.getItem(GIST_KEY) || '';

  $('#btnCreateGist').onclick = async ()=>{
    const token = inputToken.value.trim();
    if(!token){ alert('ادخل الToken'); return; }
    const payload = {
      "description":"Shop App Sync Data",
      "public": false,
      "files": {
        "shop_data.json": { "content": JSON.stringify(state) }
      }
    };
    log.textContent = 'جاري انشاء Gist...';
    try{
      const res = await fetch('https://api.github.com/gists', {
        method:'POST',
        headers: { 'Authorization':'token '+token, 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(data.id){ localStorage.setItem(GIST_KEY, data.id); localStorage.setItem('github_token', token); log.textContent = 'تم رفع البيانات. Gist ID: '+data.id; setLastSync(new Date().toLocaleString()); localStorage.setItem('lastSync', new Date().toLocaleString()); }
      else log.textContent = 'فشل: ' + JSON.stringify(data);
    }catch(err){ log.textContent = 'خطأ: '+err.message; }
  };

  $('#btnUpdateGist').onclick = async ()=>{
    const token = inputToken.value.trim(); const gistId = inputGistId.value.trim() || localStorage.getItem(GIST_KEY);
    if(!token || !gistId){ alert('ادخل token و gist id'); return; }
    const payload = { "files": { "shop_data.json": { "content": JSON.stringify(state) } } };
    log.textContent = 'جاري تحديث Gist...';
    try{
      const res = await fetch('https://api.github.com/gists/' + gistId, {
        method:'PATCH',
        headers: { 'Authorization':'token '+token, 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(data.id){ localStorage.setItem(GIST_KEY, data.id); localStorage.setItem('github_token', token); log.textContent = 'تم التحديث. Gist ID: '+data.id; setLastSync(new Date().toLocaleString()); localStorage.setItem('lastSync', new Date().toLocaleString()); }
      else log.textContent = 'فشل: ' + JSON.stringify(data);
    }catch(err){ log.textContent = 'خطأ: '+err.message; }
  };

  $('#btnPullGist').onclick = async ()=>{
    const gistId = inputGistId.value.trim() || localStorage.getItem(GIST_KEY);
    if(!gistId){ alert('ادخل gist id'); return; }
    log.textContent = 'جاري سحب البيانات...';
    try{
      const res = await fetch('https://api.github.com/gists/' + gistId);
      const data = await res.json();
      if(data.files && data.files['shop_data.json'] && data.files['shop_data.json'].content){
        const content = JSON.parse(data.files['shop_data.json'].content);
        state = content;
        saveState();
        render('products');
        log.textContent = 'تم استيراد البيانات من Gist.';
      } else {
        log.textContent = 'لم اجد ملف shop_data.json في الGist.';
      }
    }catch(err){ log.textContent = 'خطأ: '+err.message; }
  };
}

// Settings
function renderSettings(){
  const tpl = document.getElementById('tpl-settings').content.cloneNode(true);
  $('#main').appendChild(tpl);
  $('#btnClearData').onclick = ()=>{ if(confirm('حذف كل البيانات المحلية؟')){ state = {products:[],shops:[],invoices:[]}; saveState(); render('products'); } };
}

// helpers
function escape(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

document.addEventListener('DOMContentLoaded', init);
