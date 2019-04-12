// SW version
const version ='1.2';

// Static Cache - App Shell
const appAssets = [
    "index.html",
    "main.js",
    "images/flame.png",
    "images/logo.png",
    "images/sync.png", 
    "vendor/bootstrap.min.css",
    "vendor/jquery.min.js"
];

//SW install
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(`static-${version}`)
            .then(cache => cache.addAll(appAssets))
    );
});

//SW activate
self.addEventListener('activate', e => {
    //Clean static cache
    let cleaned = caches.keys().then(keys => {
        keys.forEach(key => {
            if( key !== `static-${version}` && key.match('static-') ) {
                return caches.delete(key);
            }
        });
    });

    e.waitUntil(cleaned);
});

// Static cache strategy - Cache with Network Fallback
const staticCache = (req, cacheName = `static-${version}`) => {
    return caches.match(req).then(cachedRes => { 
        //Return cached response it found
        if(cachedRes) return cachedRes;

        //Fallback to Network
        return fetch(req).then( networkRes => {
            //Update cache with new response
            caches.open(cacheName)
                .then(cache => cache.put( req, networkRes));
            
            //Return Clone of Network Response
            return networkRes.clone();
        });
    });
};

// Network with cache Fallback
const fallbackCache = (req) => {

    // Try Network
    return fetch(req).then( networkRes =>{

        // Check res is OK, else go to cache
        if(!networkRes.ok) throw 'Fetch Eror';

         //Update cache with new response
        caches.open(`static-${version}`)
            .then(cache => cache.put( req, networkRes));
        
        //Return Clone of Network Response
        return networkRes.clone();
    })

    //Try cache, it is the fallback
    .catch( err => caches.match(req));
};

// Clean old gif from the cache
const cleanGiphyCache = (giphys) => {

    //Open gyphy cache
    caches.open('giphy').then(cache => {
        
        cache.keys().then( keys =>{

            keys.forEach( key =>{

                // If the key is not part of current giphy delete it
                if(!giphys.includes(key.url)) cache.delete(key);
            });
        });
    });
};

// SW fetch
self.addEventListener('fetch', e => {

    //App shell
    if(e.request.url.match(location.origin)){
        e.respondWith(staticCache(e.request));
    
    // Giphy API    
    }else if(e.request.url.match('api.giphy.com/v1/gifs/trending')) {
        e.respondWith(fallbackCache(e.request));
    

    // Giphy media    
    }else if(e.request.url.match('giphy.com/media')) {
        e.respondWith(staticCache(e.request, 'giphy'));
    }
});

//Listen for message from client
self.addEventListener('message', e =>{

    // Identify the message
    if(e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
});