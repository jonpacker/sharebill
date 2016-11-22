// An array of checksummed files to cache, inserted by the build process. Just
// imagine it was here and that it looked like this:
// var toCache = ['blah.js', 'cats.gif', 'johanna.gif'];
const version = 'v1';
this.addEventListener('install', function(event) {
  caches.open(version).then(function(cache) {
    return cache.addAll([
      '',
      'balances'
    ].concat(toCache))
  });
});

function getDb() {
  return new Promise(function(resolve, reject) {
    var requestDbOpen = indexedDB.open("sharebill-data-cache", 3);
    requestDbOpen.onsuccess = function(event) {
      resolve(event.target.result);
    };
    requestDbOpen.onerror = function(event) {
      console.log(`SW: ${event.target.errorCode}: Could not open IndexedDB database: no data being cached`);
      reject(event.target.errorCode);
    };
    requestDbOpen.onupgradeneeded = function(event) {
      db = event.target.result;
      db.createObjectStore("queued", { keyPath: "id" });
    };
  });
}

function handleBalancesRequest(event) {
  event.respondWith(fetch(event.request).then(function(response) {
    var responseToCache = response.clone();
    caches.open(version).then(function(cache) {
      cache.put(event.request, responseToCache);
    });
    return response.text().then(function(text) {
      var balances = JSON.parse(text);
      var responseSettings = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };
      console.log(balances);
      return getDb().then(function(db) {
        transformBalances(balances);
        return new Response(JSON.stringify(balances), responseSettings);
      }).catch(function() {
        return new Response(JSON.stringify(balances), responseSettings);
      });
    })
  }));
}

this.addEventListener('fetch', function(event) {
  if (event.request.url.match(/\/balances/)) {
    handleBalancesRequest(event);
  } else {
    event.respondWith(caches.match(event.request).catch(function() {
      return fetch(event.request);
    }).then(function(res) {
      if (!res) return fetch(event.request);
      else return res;
    }));
  }
});

var transformBalances = function(balances) {
  balances.rows.forEach(function(balance) {
  })
  return balances;
};
