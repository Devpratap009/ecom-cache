require('dotenv').config();
// Runs against a development database. Uses an administrator account from .env.
const assert = require('node:assert/strict');
const base = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
let cookie = '', uploadedImageUrl = '', id;
async function req(path, method='GET', body, expected=200) {
  const headers = { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) };
  const r = await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  const data = await r.json();
  if (path === '/api/auth/login' && r.ok) cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  assert.equal(r.status,expected,JSON.stringify(data)); return data;
}
async function main(){
  const health=await req('/api/health');assert.equal(health.redisReady,true,'Start Redis first');
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running the live smoke test.');
  const meBefore=await req('/api/auth/me');assert.equal(meBefore.user,null);
  const unauth=await fetch(base+'/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Should be blocked',price:1,description:'unauthenticated'})});
  assert.equal(unauth.status,401,'Product creation must require an authenticated admin');
  await req('/api/auth/login','POST',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD,role:'admin'});
  const me=await req('/api/auth/me');assert.equal(me.user.role,'admin','Smoke test must sign in as admin');
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p0sAAAAASUVORK5CYII=';
  const upload=await req('/api/uploads/products','POST',{imageData:`data:image/png;base64,${png}`},201);uploadedImageUrl=upload.imageUrl;
  const imageResponse=await fetch(base+uploadedImageUrl);assert.equal(imageResponse.status,200,'Uploaded product image should be served');
  const product={name:`Cache smoke ${Date.now()}`,price:1,description:'Temporary test product',category:'test',inStock:true,imageUrl:uploadedImageUrl};
  let productId = null;
  try {
    const created=await req('/api/products','POST',product,201);id=created.product._id;productId=id;assert.equal(created.cacheInvalidated,true);
    const item=`/api/products/${id}`, catalog='/api/products';
    await req(catalog+'/cache/all','DELETE');
    assert.equal((await req(catalog)).source,'db');assert.equal((await req(catalog)).isCached,true);
    assert.equal((await req(item)).source,'db');assert.equal((await req(item)).isCached,true);
    await req(item+'/cache','DELETE');assert.equal((await req(item)).source,'db');assert.equal((await req(catalog)).isCached,true);
    await req(catalog+'/cache/all','DELETE');assert.equal((await req(item)).source,'db');assert.equal((await req(catalog)).source,'db');
    const edited={...product,price:2};assert.equal((await req(item,'PUT',edited)).cacheInvalidated,true);
    const updated=await req(item);assert.equal(updated.source,'db');assert.equal(updated.product.price,2);
    const list=await req(catalog);assert.equal(list.products.find(p=>p._id===id).price,2);
    assert.equal((await req(item,'DELETE')).cacheInvalidated,true);await req(item,'GET',null,404);id=null;uploadedImageUrl='';
    assert.equal((await req(catalog)).products.some(p=>p._id===productId),false);
    console.log('Live API smoke test passed: auth, admin protection, image upload, CRUD, hits, single/all invalidation.');
  } finally {
    if(id) await req(`/api/products/${id}`,'DELETE').catch(e=>console.warn('Product cleanup failed:',e.message));
    if(uploadedImageUrl) { /* If product creation failed before it owned the image, the file can be removed manually from uploads/products. */ }
    await req('/api/auth/logout','POST').catch(()=>{});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
