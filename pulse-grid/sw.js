// Network-first PULSE ARCADE offline support. Same-origin files only.
// Navigation cache keys deliberately ignore query strings, so a shared
// ?goal=2000 challenge can still load the game while offline.
const CACHE='pulse-arcade-v2';
const SHELL=[
  '/', '/arcade.html', '/orbit.html', '/partners.html',
  '/license-order.html', '/favicon.svg', '/cover.png',
  '/manifest.webmanifest'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(name=>name!==CACHE).map(name=>caches.delete(name))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  const isNavigation=request.mode==='navigate';
  const cacheKey=isNavigation?url.origin+url.pathname:request;
  event.respondWith(
    fetch(request).then(response=>{
      if(response.ok){
        const clone=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(cacheKey,clone)).catch(()=>{}));
      }
      return response;
    }).catch(async()=>{
      const cached=await caches.match(cacheKey);
      if(cached)return cached;
      if(isNavigation)return (await caches.match('/'))||Response.error();
      return Response.error();
    })
  );
});
