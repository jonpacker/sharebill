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
