/**
 * rdfapi.filters
 */
(function(api) {
  api.filters = {
    s: function(s) { return function(t) { return s.equals(t.subject); }; },
    p: function(p) { return function(t) { return p.equals(t.property); }; },
    o: function(o) { return function(t) { return o.equals(t.object); }; },
    sp: function(s,p) { return function(t) { return s.equals(t.subject) && p.equals(t.property); }; },
    so: function(s,o) { return function(t) { return s.equals(t.subject) && o.equals(t.object); }; },
    po: function(p,o) { return function(t) { return p.equals(t.property) && o.equals(t.object); }; },
    spo: function(s,p,o) { return function(t) { return s.equals(t.subject) && p.equals(t.property) && o.equals(t.object); }; },
    describes: function(resource) { return function(t) { return resource.equals(t.subject) || resource.equals(t.object); }; }
  };
})(rdfapi);
