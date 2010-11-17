/**
 * Serializers (NTriples, Turtle)
 */
(function(api) {
  if(!api.serializers) { api.serializers = {} }
  /**
   * NTriples implements DataSerializer
   */
  api.serializers.NTriples = function(context) {};
  api.serializers.NTriples.prototype = {
    serialize: function(graph) { return graph.toArray().join("\n") }
  };
  /**
   * Turtle implements DataSerializer
   */
  api.serializers.Turtle = function(context) {
    this.context = context;
    this.createPrefixMap()
  };
  api.serializers.Turtle.NS_RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  api.serializers.Turtle.RDF_TYPE = new api.IRI(api.serializers.Turtle.NS_RDF + "type");
  api.serializers.Turtle.RDF_RDF = new api.IRI(api.serializers.Turtle.NS_RDF + "RDF");
  api.serializers.Turtle.RDF_FIRST = new api.IRI(api.serializers.Turtle.NS_RDF + "first");
  api.serializers.Turtle.RDF_REST = new api.IRI(api.serializers.Turtle.NS_RDF + "rest");
  api.serializers.Turtle.RDF_NIL = new api.IRI(api.serializers.Turtle.NS_RDF + "nil");
  api.serializers.Turtle.prototype = {
    context: null, index: null, lists: null, prefixMap: null, usedPrefixes: null, nonAnonBNodes: null, skipSubjects: null,
    serialize: function(graph) {
      this.initiate();
      graph = this.suckLists(graph);
      var _ = this;
      graph.forEach(function(t, i, s) { _.addTripleToIndex(t, i, s) });
      return this.render()
    },
    addTripleToIndex: function(t, i, s) {
      if(t.object.nodeType() == "BlankNode") {
        this.nonAnonBNodes.set(t.object.toString(), this.nonAnonBNodes.exists(t.object.toString()) ? this.nonAnonBNodes.get(t.object.toString()) + 1 : 1)
      }
      var s1 = this.shrink(t.subject);
      var p = this.shrink(t.property, true);
      if(!this.index.exists(s1)) { this.index.set(s1, new Hash) }
      if(!this.index.get(s1).exists(p)) { this.index.get(s1).set(p, new Array) }
      this.index.get(s1).get(p).push(t.object)
    },
    anonBNode: function(subject, indent) { return this.propertyObjectChain(this.index.get(subject), indent) },
    createPrefixMap: function() {
      var m = this.context.getMapping();
      var p = this.prefixMap = new Hash;
      m.keys().forEach(function(k, i, a) { p.set(m.get(k).toString(), k.concat(":")) })
    },
    initiate: function() {
      this.index = new Hash;
      this.usedPrefixes = new Array;
      this.nonAnonBNodes = new Hash;
      this.skipSubjects = new Array;
      this.lists = new Hash
    },
    output: function(o) {
      if(o.nodeType() == "IRI") { return this.shrink(o) }
      if(o.nodeType() == "TypedLiteral") {
        if(o.type.equals(this.context.resolveCurie("xsd:integer"))) { return o.value }
        if(o.type.equals(this.context.resolveCurie("xsd:double"))) { return o.value }
        if(o.type.equals(this.context.resolveCurie("xsd:decimal"))) { return o.value }
        if(o.type.equals(this.context.resolveCurie("xsd:boolean"))) { return o.value }
        return '"' + o.value + '"^^' + this.shrink(o.type);
      }
      return o.toNT()
    },
    propertyObjectChain: function(po, indent) {
      if(!po) return;
      if(indent == null) { indent = 2 }
      var out = "";
      var _ = this;
      var properties = po.keys();
      properties.sort();
      if(properties.contains("a")) {
        properties.remove("a");
        properties.unshift("a")
      }
      properties.forEach(function(property, pi, pa) {
        out = out + (pi > 0 ? (new Array(indent + 1)).join(" ") : "") + property + " ";
        po.get(property).forEach(function(o, oi, oa) {
          var oindent = "";
          if(oa.length > 2) {
            oindent = "\n" + (new Array(indent + 2 + 1)).join(" ")
          }
          if(o.toString().charAt(0) == "_" && !_.nonAnonBNodes.exists(o.toString())) {
            if(_.lists.exists(o.toNT())) {
              out = out + _.renderList(o.toNT(), indent + 3)
            }else {
              out = out + oindent + "[ " + _.anonBNode(o.toString(), indent + 2 + 2) + oindent + (oa.length == 1 ? " " : "") + "]"
            }
          }else {
            out = out + oindent + _.output(o)
          }
          if(oa.length - 1 != oi) {
            if(oa.length > 2) {
              out = out + "," + (new Array(indent + 2 + 2)).join(" ")
            }else {
              out = out + ", "
            }
          }
        });
        out = out + (pa.length - 1 == pi ? "" : ";\n")
      });
      return out
    },
    render: function() {
      var out = new Array;
      var _ = this;
      this.skipSubjects = this.nonAnonBNodes.keys();
      this.nonAnonBNodes.keys().forEach(function(k, i, a) { if(_.nonAnonBNodes.get(k) == 1) { _.nonAnonBNodes.remove(k) } });
      this.index.keys().forEach(function(subject, $is, $as) {
        var single = "";
        if(subject.charAt(0) == "_") {
          if(!_.nonAnonBNodes.exists(subject) && !_.skipSubjects.contains(subject)) {
            if(_.lists.exists(subject)) {
              single = _.renderList(subject, 2) + " " + _.propertyObjectChain(_.index.get(subject))
            } else {
              single = "[ " + _.anonBNode(subject, 2) + "\n]"
            }
          }
        } else {
          single = subject + " " + _.propertyObjectChain(_.index.get(subject))
        }
        if(single.length > 0) { out.push(single + " .\n") }
      });
      if(this.usedPrefixes.length > 0) {
        var invertedMap = new Hash;
        this.prefixMap.keys().forEach(function(k, i, h) { if(_.usedPrefixes.contains(k)) { invertedMap.set(_.prefixMap.get(k), k) } });
        var prefixes = invertedMap.keys();
        prefixes.sort();
        prefixes.reverse();
        out.unshift("");
        prefixes.forEach(function(s, i, a) { out.unshift("@prefix " + s + " <" + invertedMap.get(s) + "> .") })
      }
      return out.join("\n")
    },
    renderList: function(o, indent) {
      var _ = this;
      var list = new Array;
      _.lists.get(o).forEach(function(n, i, a) { list.push(_.output(n)) });
      var lis = new Array;
      var liststring = "";
      while(list.length > 0) {
        var li = list.shift();
        if(liststring.length + li.length < 75) {
          liststring = liststring.concat(li + " ")
        } else {
          lis.push(liststring);
          liststring = li + " "
        }
      }
      lis.push(liststring);
      var nl = lis.length == 1 ? " " : "\n" + (new Array(indent)).join(" ");
      return"(" + nl + lis.join(nl) + (lis.length == 1 ? "" : "\n") + ")"
    },
    shrink: function(n, property) {
      if(property == null) { property = false }
      if(property && n.equals(api.serializers.Turtle.RDF_TYPE)) { return "a" }
      if(n.equals(api.serializers.Turtle.RDF_NIL)) { return "()" }
      var _g = 0, _g1 = this.prefixMap.keys();
      while(_g < _g1.length) {
        var i = _g1[_g];
        ++_g;
        if(n.toString().startsWith(i)) {
          if(!this.usedPrefixes.contains(i)) { this.usedPrefixes.push(i) }
          return n.toString().replace(i, this.prefixMap.get(i))
        }
      }
      return n.toNT()
    },
    suckLists: function(graph) {
      var sFilter = function(n) { return function(t, i, s) { return t.subject.equals(n) } };
      var pFilter = function(n) { return function(t, i, s) { return t.property.equals(n) } };
      var poFilter = function(p, o) { return function(t, i, s) { return t.property.equals(p) && t.object.equals(o) } };
      var tFilter = function(a) { return function(t, i, s) { return!(t.subject.equals(a.subject) && t.property.equals(a.property) && t.object.equals(a.object)) } };
      var members = graph.filter(function(t, i, s) { return t.property.equals(api.serializers.Turtle.RDF_FIRST) || t.property.equals(api.serializers.Turtle.RDF_REST) });
      members.forEach(function(t, i, s) { graph = graph.filter(tFilter(t)) });
      var ends = members.filter(function(t, i, s) { return t.object.equals(api.serializers.Turtle.RDF_NIL) });
      var _ = this;
      ends.forEach(function(n, i, s) {
        var tmplist = new Array;
        var q = n;
        var start = null;
        while(q != null) {
          start = q.subject;
          tmplist.unshift(members.filter(sFilter(start)).filter(pFilter(api.serializers.Turtle.RDF_FIRST)).toArray().pop().object);
          members = members.filter(function(t, i1, s1) { return!t.subject.equals(start) });
          q = members.filter(poFilter(api.serializers.Turtle.RDF_REST, start)).toArray().pop()
        }
        _.lists.set(start.toNT(), tmplist)
      });
      return graph
    }
  };
})(rdfapi);
