// An array of checksummed files to cache, inserted by the build process. Just
// imagine it was here and that it looked like this:
// var toCache = ['blah.js', 'cats.gif', 'johanna.gif'];
const version = 'v1';
this.addEventListener('install', function(event) {
  caches.open(version).then(function(cache) {
    return cache.addAll([
      '',
      'balances',
      'recent'
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
      var store = db.createObjectStore("queued", { keyPath: "id" });
    };
  });
}

function requestWithCacheUpdate(originalRequest) {
  var headers = new Headers(originalRequest.headers);
  headers.append('Cache-Control', 'no-cache');
  headers.append('Pragma', 'no-cache');
  var req = new Request(originalRequest, {
    headers: headers,
    cache: 'no-cache'
  });
  return req;
}

function handleBalancesRequest(event) {
  event.respondWith(fetch(requestWithCacheUpdate(event.request)).then(function(response) {
    var responseToCache = response.clone();

    // cache successful balances response
    caches.open(version).then(function(cache) {
      cache.put(event.request, responseToCache);
    });

    // send balances response from server to client
    return response.text().then(function(text) {
      var balances = JSON.parse(text);
      var responseSettings = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };
      return getQueuedTransactions().then(function(transactions) {
        transformBalances(balances, transactions);
        return new Response(JSON.stringify(balances), responseSettings);
      }).catch(function() {
        return new Response(JSON.stringify(balances), responseSettings);
      });
    })
  }));
}

function getQueuedTransactions() {
  return getDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var txn = db.transaction("queued", "readonly");
      var queued = txn.objectStore("queued").getAll();

      queued.onsuccess = function() {
        resolve(queued.result);
      }
      queued.onerror = reject;

      txn.oncomplete = function() {
        db.close();
      }
    })
  })
}

function patchRecent(recent, queued, max) {
  var recentTxns = recent.rows;
  var spoofedQueued = queued.map(function(txn) {
    return {
      id: txn.id,
      key: txn.meta.timestamp,
      value: {
        _id: txn.id,
        _rev: "-1-_",
        meta: txn.meta,
        transaction: txn.transaction
      }
    }
  });
  recent.rows = recent.rows.concat(spoofedQueued);
  recent.rows.sort(function(a, b) {
   return a.key < b.key ? 1 : -1;
  });

  if (recent.rows.length > max) recent.rows = recent.rows.slice(0, max);
  recent.total_rows = recent.rows.length;

  return recent;
}

function handleRecentTransactionsRequest(event) {
  event.respondWith(fetch(requestWithCacheUpdate(event.request)).then(function(res) {
    // read cached recent posts and append changes
    return Promise.all([
      res.clone().json(),
      getQueuedTransactions()
    ]).then(function(results) {
      var recent = results[0];
      var queued = results[1];

      recent = patchRecent(recent, queued, 10);
      var body = new Blob([JSON.stringify(recent)], {type:'application/json'});
      return new Response(body, { status: 200 })
    })
  }));
}

function handleNewPost(event) {
  event.respondWith(fetch(event.request.clone()).catch(function() {
    return event.request.json().then(function(entry) {
      //add updates to indexeddb and respond with spoofed server response
      return getDb().then(function(db) {
        return new Promise(function (resolve, reject) {
          var txn = db.transaction("queued", "readwrite");
          var request = txn.objectStore("queued")
            .put({
              id: entry._id,
              meta: entry.meta,
              transaction: entry.transaction
            });
          request.onsuccess = resolve;
          request.onerror = reject;
          txn.oncomplete = function() {
            db.close();
          }
        }).then(function() {
          var fakeServerResponse = {
            "ok": true,
            "id": entry._id,
            "rev": "-1-_"
          };
          var body = new Blob([JSON.stringify(fakeServerResponse)], {type:'application/json'});
          return new Response(body, {
            status: 201,
            statusText: "Created"
          });
        });
      })
    })
  }))
}

this.addEventListener('fetch', function(event) {
  if (event.request.url.match(/\/balances/)) {
    handleBalancesRequest(event);
  } else if (event.request.url.match(/\/recent/)) {
    handleRecentTransactionsRequest(event);
  } else if (event.request.url.match(/\/post\/[\d\w]{8}-[\d\w]{4}-[\d\w-]+/)
             && event.request.method == 'PUT') {
    handleNewPost(event);
  } else {
    event.respondWith(caches.match(event.request).catch(function() {
      return fetch(event.request);
    }).then(function(res) {
      if (!res) return fetch(event.request);
      else return res;
    }));
  }
});

function parseFraction(str) {
  var components = str.match(/([-\d]+$)?(([-\d]+\s)?(([-\d]+)\/([-\d]+)))?/);
  if (components[1]) return parseInt(components[1]);
  var whole = components[3] ? parseInt(components[3]) : 0;
  var numerator = parseInt(components[5]);
  var denominator = parseInt(components[6]);
  return whole + numerator/denominator;
}

function HCF(u, v) {
  var U = u;
  var V = v;
  while (true) {
    if (!(U %= V)) return V
    if (!(V %= U)) return U
  }
}
//convert a decimal into a fraction
function toFraction(decimal) {
  var whole = String(decimal).split('.')[0];
  var decimal = parseFloat("." + String(decimal).split('.')[1]);
  var num = parseInt("1" + "0".repeat(String(decimal).length - 2));
  //return whole if number is has not decimal part
  if (Number.isNaN(decimal)) return whole;

  decimal = parseInt(decimal * num); //get rid of 0.00000001 part
  for (var z = 2; z < decimal + 1; z++) {
    if (decimal % z === 0 && num % z === 0) {
      decimal = decimal / z;
      num = num / z;
      z = 2;
    }
  }
  //if format of fraction is xx/xxx
  if (decimal.toString().length === 2 && num.toString().length === 3) {
    //reduce by removing trailing 0's
    decimal = Math.round(Math.round(decimal) / 10);
    num = Math.round(Math.round(num) / 10);
  }
  //if format of fraction is xx/xx
  else if (decimal.toString().length === 2 &&
    num.toString().length === 2) {
    decimal = Math.round(decimal / 10);
    num = Math.round(num / 10);
  }
  //get highest common factor to simplify
  var t = HCF(decimal, num);

  //return the fraction after simplifying it and trims if input is in form .XX
  return (((whole === '0') ? '' : whole + ' ') + decimal / t + "/" + num / t).trim();
}

var transformBalances = function(balances, queuedTransactions) {
  var adjustments = queuedTransactions.reduce(function(adj, txn) {
    Object.keys(txn.transaction.credits).forEach(function(account) {
      adj[account] = (adj[account] || 0) + parseFraction(txn.transaction.credits[account]);
    })
    Object.keys(txn.transaction.debets).forEach(function(account) {
      adj[account] = (adj[account] || 0) - parseFraction(txn.transaction.debets[account]);
    })
    return adj;
  }, {});
  balances.rows = balances.rows.map(function(balance) {
    balance.value = toFraction(parseFraction(balance.value) + (adjustments[balance.key] || 0));
    return balance;
  })
  return balances;
};
