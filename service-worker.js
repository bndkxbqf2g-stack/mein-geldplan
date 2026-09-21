var CACHE_NAME='mein-geldplan-v6';
var APP_SHELL=['./','./index.html','./app.js?v=41','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',function(event){
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache){return cache.addAll(APP_SHELL);}));
  self.skipWaiting();
});

self.addEventListener('activate',function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(key){return key!==CACHE_NAME;}).map(function(key){return caches.delete(key);}));
  }));
  self.clients.claim();
});

self.addEventListener('fetch',function(event){
  if(event.request.method!=='GET')return;
  var url=new URL(event.request.url);
  var appAsset=event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/app.js')||url.pathname.endsWith('/manifest.webmanifest');
  event.respondWith((appAsset?fetch(event.request,{cache:'no-store'}):caches.match(event.request).then(function(cached){return cached||fetch(event.request);})).then(function(response){
    if(!response||response.status!==200||response.type==='opaque')return response;
    var copy=response.clone();
    caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,copy);});
    return response;
  }).catch(function(){return caches.match(event.request);}));
});
