/**
 * ECMAScript-262 v5 Compatability
 */
Array.isArray = Array.isArray || function(o) { return Object.prototype.toString.call(o) === '[object Array]'; };
Array.prototype.some = Array.prototype.some || function(fun /*, thisp */) {
  "use strict";
  if (this === void 0 || this === null) throw new TypeError();
  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") throw new TypeError();
  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t && fun.call(thisp, t[i], i, t)) return true;
  }
  return false;
};
Array.prototype.every = Array.prototype.every || function(fun /*, thisp */) {
  "use strict";
  if (this === void 0 || this === null) throw new TypeError();
  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") throw new TypeError();
  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t && !fun.call(thisp, t[i], i, t)) return false;
  }
  return true;
};
Array.prototype.forEach = Array.prototype.forEach || function(fun /*, thisp */) {
  "use strict";
  if (this === void 0 || this === null) throw new TypeError();
  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") throw new TypeError();
  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t) fun.call(thisp, t[i], i, t);
  }
};
Array.prototype.filter = Array.prototype.filter || function(fun /*, thisp */) {
  "use strict";
  if (this === void 0 || this === null) throw new TypeError();
  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") throw new TypeError();
  var res = [];
  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t) {
      var val = t[i];
      if( fun.call(thisp, val, i, t)) res.push(val);
    }
  }
  return res;
};

/**
 * Custom stuff that may get factored out..
 */
Object.prototype.iterator = function() {
  var o = this.instanceKeys();
  var y = this;
  return {
    cur:0, arr:o,
    hasNext: function() { return this.cur < this.arr.length },
    next:function() { return y[this.arr[this.cur++]] }
  }
};
Object.prototype.instanceKeys = function(proto) {
  var keys = [];
  proto = !proto;
  for(var i in this) {
    if(proto && Object.prototype[i]) { continue }
    keys.push(i)
  }
  return keys
};
String.prototype.endsWith = function(s, i) {
  if(i) { return s.toLowerCase() == this.substring(this.length - s.length).toLowerCase() }
  return s == this.substring(this.length - s.length)
};
String.prototype.startsWith = function(s, i) {
  if(i) { return s.toLowerCase() == this.substring(0, s.length).toLowerCase() }
  return s == this.substring(0, s.length)
};
Array.prototype.remove = Array.prototype.indexOf ? function(obj) {
  var idx = this.indexOf(obj);
  if(idx == -1) {  return false }
  this.splice(idx, 1);
  return true
} : function(obj) {
  var i = 0;
  var l = this.length;
  while(i < l) {
    if(this[i] == obj) {
      this.splice(i, 1);
      return true
    }
    i++
  }
  return false
};
Array.prototype.iterator = function() {
  return {
    cur: 0, arr: this,
    hasNext: function() { return this.cur < this.arr.length },
    next: function() { return this.arr[this.cur++] }
  }
};
Array.prototype.contains = function(i) { return this.indexOf(i) >= 0 };
