/**
 * rdfapi.querylangs
 */
(function(api) {
  if(!api.querylangs) { api.querylangs = {} }
  /**
   * RDF Selectors, implements DataQuery
   */
  api.querylangs.RDFSelector = function(context) {
    this.context = context
  };
  api.querylangs.RDFSelector.PATH_START = new RegExp("^[^!\\^]+", "ig");
  api.querylangs.RDFSelector.PATH_PARTS = new RegExp("[!\\^][^!\\^]+", "ig");
  api.querylangs.RDFSelector.prototype = {
    context: null,
    select: function(query, graph) {
      var _ = this;
      var refs = query.match(api.querylangs.RDFSelector.PATH_START).map(function(s, i, a) {  return _.context.resolveCurie(s).toNT() });
      var parts = query.match(api.querylangs.RDFSelector.PATH_PARTS);
      var part = "";
      while(parts.length > 1) {
        part = parts.shift();
        var tempRefs = [[]];
        var p = [_.context.resolveCurie(part.slice(1))];
        switch(part.charAt(0)) {
          case "!":
            refs.forEach(function(tempRefs, p) {
              return function(ref, i, a) {
                graph.forEach(function(tempRefs, p) {
                  return function(t, i1, s) {
                    if(t.subject.toNT() == ref && t.property.equals(p[0]) && !tempRefs[0].contains(t.object.toNT())) {
                      tempRefs[0].push(t.object.toNT())
                    }
                  }
                }(tempRefs, p))
              }
            }(tempRefs, p));
            break;
          case "^":
            refs.forEach(function(tempRefs, p) {
              return function(ref, i, a) {
                graph.forEach(function(tempRefs, p) {
                  return function(t, i1, s) {
                    if(t.object.toNT() == ref && t.property.equals(p[0]) && !tempRefs[0].contains(t.subject.toNT())) {
                      tempRefs[0].push(t.subject.toNT())
                    }
                  }
                }(tempRefs, p))
              }
            }(tempRefs, p));
            break
        }
        refs = tempRefs[0]
      }
      part = parts.pop();
      var curiemap = new Object({});
      parts = part.slice(1).split(",").map(function(s, i, a) {
        var c = _.context.resolveCurie(s).toNT();
        curiemap[c] = s;
        return c
      });
      var out = new Array;
      refs.forEach(function(ref, i, a) {
        var row = new Object({});
        parts.forEach(function(p, i1, a1) { row[curiemap[p]] = [] });
        row["uri"] = ref;
        out.push(row)
      });
      var working = graph;
      if(part.charAt(0) == "!") {
        working.filter(function(t, i, s) {
          return refs.contains(t.subject.toNT())
        }).forEach(function(t, i, s) {
          if(parts.contains(t.property.toNT())) {
            out[refs.indexOf(t.subject.toNT())][curiemap[t.property.toNT()]].push(t.object)
          }
        })
      }else {
        working.filter(function(t, i, s) {
          return refs.contains(t.object.toNT())
        }).forEach(function(t, i, s) {
          if(parts.contains(t.property.toNT())) {
            out[refs.indexOf(t.object.toNT())][curiemap[t.property.toNT()]].push(t.subject)
          }
        })
      }
      return out
    }
  };
})(rdfapi);
