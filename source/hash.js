/**
 * Hash (fast kv hash)
 */
Hash = function(p) { this.empty() };
Hash.prototype = {
  h: null,
  get: function(k) { return this.h[k] },
  set: function(k, v) { this.h[k] = v },
  empty: function() { this.h = {} },
  exists: function(k) { return this.h.hasOwnProperty(k) },
  iterator: function() { return this.h.iterator() },
  keys: function() { return this.h.instanceKeys() },
  remove: function(k) {
    var r = this.get(k);
    delete this.h[k];
    return r
  },
  toArray: function() {
    var a = new Array;
    var _ = this;
    this.keys().forEach(function(k) { a.push(_.get(k)) });
    return a
  },
  toString: function() { return JSON.stringify(this.h) }
};
