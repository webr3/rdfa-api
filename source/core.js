/**
 * @fileOverview
 * 
 * rdfapi - see: <http://github.com/webr3/rdfa-api>
 * 
 * @author Nathan <http://webr3.org/nathan#me>
 * @version 2010-10-29T03:30:00Z
 * @license http://creativecommons.org/publicdomain/zero/1.0/
 * 
 * source: <http://github.com/webr3/rdfa-api> To the extent possible under law,
 * <http://webr3.org/nathan#me> has waived all copyright and related or
 * neighboring rights to this work.
 * 
 * all code in this library is 100% unique to this library and nothing is
 * begged, stolen or borrowed, thus no other licenses are affected.
 */

/**
 * Core RDF API Interfaces
 */
rdfapi = function() {
  api = {};
  /**
   * Hash (fast kv hash)
   */
  api.Hash = function(p) { this.empty() };
  api.Hash.prototype = {
    h: null,
    get: function(k) { return this.h[k] },
    set: function(k, v) { this.h[k] = v },
    empty: function() { this.h = {} },
    exists: function(k) { return this.h.hasOwnProperty(k) },
    keys: function() {
      var keys = [];
      proto = !proto;
      for(var i in this.h) {
        if(proto && Object.prototype[i]) { continue }
        keys.push(i)
      }
      return keys
    },
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
  /**
   * RDFNode
   */
  api.RDFNode = function() {};
  api.RDFNode.prototype = {
    value: null,
    equals: function(other) {
      if( this.nodeType() != other.nodeType() ) return false;
      switch(this.nodeType()) {
        case "IRI":
        case "BlankNode":
          return this.value == other.value;
        case "PlainLiteral":
          return this.language == other.language && this.value == other.value;
        case "TypedLiteral":
          return this.type.equals(other.type) && this.value == other.value;
      }
      return this.toNT() == other.toNT()
    },
    nodeType: function() { return "RDFNode" },
    toNT: function() { return "" },
    toString: function() { return this.value },
    encodeString: function(s) {
      var out = "";
      var skip = false;
      var _g1 = 0, _g = s.length;
      while(_g1 < _g) {
        var i = _g1++;
        if(!skip) {
          var code = s.charCodeAt(i);
          if(55296 <= code && code <= 56319) {
            var low = s.charCodeAt(i + 1);
            code = (code - 55296) * 1024 + (low - 56320) + 65536;
            skip = true
          }
          if(code > 1114111) { throw new Error("Char out of range"); }
          var hex = "00000000".concat((new Number(code)).toString(16).toUpperCase());
          if(code >= 65536) {
            out += "\\U" + hex.slice(-8)
          } else {
            if(code >= 127 || code <= 31) {
              switch(code) {
                case 9:  out += "\\t"; break;
                case 10: out += "\\n"; break;
                case 13: out += "\\r"; break;
                default: out += "\\u" + hex.slice(-4); break
              }
            } else {
              switch(code) {
                case 34: out += '\\"'; break;
                case 92: out += "\\\\"; break;
                default: out += s.charAt(i); break
              }
            }
          }
        } else {
          skip = !skip
        }
      }
      return out
    }
  };
  /**
   * BlankNode
   */
  api.BlankNode = function() { this.value = "_:b" + (new String(++api.BlankNode.NEXTID)).toString() };
  api.BlankNode.NEXTID = 0;
  api.BlankNode.prototype = {
    __proto__: api.RDFNode.prototype,
    nodeType: function() { return "BlankNode"; },
    toNT: function() { return this.value; }
  };
  /**
   * PlainLiteral
   */
  api.PlainLiteral = function(value, language) { this.value = value; this.language = language };
  api.PlainLiteral.prototype = {
    __proto__: api.RDFNode.prototype,
    language: null,
    nodeType: function() { return "PlainLiteral" },
    toNT: function() {
      var string = '"' + this.encodeString(this.value) + '"';
      return !Boolean(this.language).valueOf() ? string : string.concat("@" + this.language)
    }
  };
  /**
   * TypedLiteral
   */
  api.TypedLiteral = function(value, type) { this.value = value; this.type = type };
  api.TypedLiteral.prototype = {
    __proto__: api.RDFNode.prototype,
    type: null,
    nodeType: function() { return "TypedLiteral"; },
    toNT: function() { return '"' + this.encodeString(this.value) + '"^^<' + this.type + ">"; }
  };
  /**
   * RDFTriple
   */
  api.RDFTriple = function(s, p, o) { this.subject = s; this.property = p; this.object = o; };
  api.RDFTriple.prototype = {
    object: null, property: null, subject: null,
    toString: function() { return this.subject.toNT() + " " + this.property.toNT() + " " + this.object.toNT() + " ." },
    equals: function(t) { return this.subject.equals(t.subject) && this.property.equals(t.property) && this.object.equals(t.object) }
  };
  /**
   * IRI
   */
  api.IRI = function(iri) { this.value = iri };
  api.IRI.SCHEME_MATCH = new RegExp("^[a-z0-9-.+]+:", "i");
  api.IRI.prototype = {
    __proto__: api.RDFNode.prototype,
    nodeType: function() { return "IRI" },
    toNT: function() { return"<" + this.encodeString(this.value) + ">" },
    defrag: function() {
      var i = this.value.indexOf("#");
      return (i < 0) ? this : new api.IRI(this.value.slice(0, i))
    },
    isAbsolute: function() {
      return this.scheme() != null && this.heirpart() != null && this.fragment() == null
    },
    toAbsolute: function() {
      if(this.scheme() == null && this.heirpart() == null) { throw new Error("IRI must have a scheme and a heirpart!"); }
      return this.resolveReference(this.value).defrag()
    },
    authority: function() {
      var heirpart = this.heirpart();
      if(heirpart.substring(0, 2) != "//") { return null }
      var authority = heirpart.slice(2);
      var q = authority.indexOf("/");
      return q >= 0 ? authority.substring(0, q) : authority
    },
    fragment: function() {
      var i = this.value.indexOf("#");
      return (i < 0) ? null : this.value.slice(i)
    },
    heirpart: function() {
      var heirpart = this.value;
      var q = heirpart.indexOf("?");
      if(q >= 0) {
        heirpart = heirpart.substring(0, q)
      } else {
        q = heirpart.indexOf("#");
        if(q >= 0) { heirpart = heirpart.substring(0, q) }
      }
      var q2 = this.scheme();
      if(q2 != null) { heirpart = heirpart.slice(1 + q2.length) }
      return heirpart
    },
    host: function() {
      var host = this.authority();
      var q = host.indexOf("@");
      if(q >= 0) { host = host.slice(++q) }
      if(host.indexOf("[") == 0) {
        q = host.indexOf("]");
        if(q > 0) {  return host.substring(0, q) }
      }
      q = host.lastIndexOf(":");
      return q >= 0 ? host.substring(0, q) : host
    },
    path: function() {
      var q = this.authority();
      if(q == null) { return this.heirpart() }
      return this.heirpart().slice(q.length + 2)
    },
    port: function() {
      var host = this.authority();
      var q = host.indexOf("@");
      if(q >= 0) { host = host.slice(++q) }
      if(host.indexOf("[") == 0) {
        q = host.indexOf("]");
        if(q > 0) { return host.substring(0, q) }
      }
      q = host.lastIndexOf(":");
      if(q < 0) { return null }
      host = host.slice(++q);
      return host.length == 0 ? null : host
    },
    query: function() {
      var q = this.value.indexOf("?");
      if(q < 0) { return null }
      var f = this.value.indexOf("#");
      if(f < 0) { return this.value.slice(q) }
      return this.value.substring(q, f)
    },
    removeDotSegments: function(input) {
      var output = "";
      var q = 0;
      while(input.length > 0) {
        if(input.substr(0, 3) == "../" || input.substr(0, 2) == "./") {
          input = input.slice(input.indexOf("/"))
        }else {
          if(input == "/.") {
            input = "/"
          }else {
            if(input.substr(0, 3) == "/./") {
              input = input.slice(2)
            }else {
              if(input.substr(0, 4) == "/../" || input == "/..") {
                (input == "/..") ? input = "/" : input = input.slice(3);
                q = output.lastIndexOf("/");
                (q >= 0) ? output = output.substring(0, q) : output = "";
              }else {
                if(input.substr(0, 2) == ".." || input.substr(0, 1) == ".") {
                  input = input.slice(input.indexOf("."));
                  q = input.indexOf(".");
                  if(q >= 0) { input = input.slice(q) }
                }else {
                  if(input.substr(0, 1) == "/") {
                    output += "/";
                    input = input.slice(1)
                  }
                  q = input.indexOf("/");
                  if(q < 0) {
                    output += input;
                    input = ""
                  }else {
                    output += input.substring(0, q);
                    input = input.slice(q)
                  }
                }
              }
            }
          }
        }
      }
      return output
    },
    resolveReference: function(ref) {
      var reference;
      if(typeof ref == "string") {
        reference = new api.IRI(ref)
      }else if(ref.nodeType && ref.nodeType() == "IRI") {
        reference = ref
      }else {
        throw new Error("Expected IRI or String");
      }
      var T = {scheme:"", authority:"", path:"", query:"", fragment:""};
      var q = "";
      if(reference.scheme() != null) {
        T.scheme = reference.scheme();
        q = reference.authority();
        T.authority += q != null ? "//" + q : "";
        T.path = this.removeDotSegments(reference.path());
        q = reference.query();
        T.query += q != null ? q : ""
      }else {
        q = reference.authority();
        if(q != null) {
          T.authority = q != null ? "//" + q : "";
          T.path = this.removeDotSegments(reference.path());
          q = reference.query();
          T.query += q != null ? q : ""
        }else {
          q = reference.path();
          if(q == "" || q == null) {
            T.path = this.path();
            q = reference.query();
            if(q != null) {
              T.query += q
            }else {
              q = this.query();
              T.query += q != null ? q : ""
            }
          }else {
            if(q.substring(0, 1) == "/") {
              T.path = this.removeDotSegments(q)
            }else {
              if(this.path() != null) {
                var q2 = this.path().lastIndexOf("/");
                if(q2 >= 0) {
                  T.path = this.path().substring(0, ++q2)
                }
                T.path += reference.path()
              }else {
                T.path = "/" + q
              }
              T.path = this.removeDotSegments(T.path)
            }
            q = reference.query();
            T.query += q != null ? q : ""
          }
          q = this.authority();
          T.authority = q != null ? "//" + q : ""
        }
        T.scheme = this.scheme()
      }
      q = reference.fragment();
      T.fragment = q != null ? q : "";
      return new api.IRI(T.scheme + ":" + T.authority + T.path + T.query + T.fragment)
    },
    scheme: function() {
      var scheme = this.value.match(api.IRI.SCHEME_MATCH);
      return (scheme == null) ? null : scheme.shift().slice(0, -1)
    },
    userinfo: function() {
      var authority = this.authority();
      var q = authority.indexOf("@");
      return (q < 0) ? null : authority.substring(0, q)
    }
  };
  
  /**
   * Data implements DocumentData
   */
  api.Data = function() { this.graph = new api.Graph; this.context = new api.Context };
  api.Data.prototype = {
    context: null, graph: null,
    createContext: function() { return new api.Context }
  };
  /**
   * Graph (fast, indexed) implements RDFGraph
   */
  api.Graph = function(a) {
    this.length = 0;
    this.graph = [];
    this.index = {};
    if(Array.isArray(a)) this.importArray(a);
  };
  api.Graph.prototype = {
    length: null, graph: null,
    importArray: function(a) { while( a.length > 0) { this.add(a.pop()) } },
    get: function(index) { return this.graph[index] },
    add: function(triple) {
      if(!this.index[triple.subject.value]) this.index[triple.subject.value] = {};
      if(!this.index[triple.subject.value][triple.property.value]) this.index[triple.subject.value][triple.property.value] = [];
      if(this.index[triple.subject.value][triple.property.value].some(function(o){return o.equals(triple.object)})) return;
      this.length++;
      this.index[triple.subject.value][triple.property.value].push(triple.object);
      this.graph.push(triple);
    },
    merge: function(s) {
      var _g1 = 0, _g = s.length;
      while(_g1 < _g) {
        var i = _g1++;
        this.add(s.get(i))
      }
    },
    every: function(filter) { return this.graph.every(filter) },
    some: function(filter) { return this.graph.some(filter) },
    forEach: function(callbck) { this.graph.forEach(callbck) },
    filter: function(filter) { return new api.Graph(this.graph.filter(filter)); },
    apply: function(filter) { this.graph = this.graph.filter(filter); this.length = this.graph.length; },
    iterator: function() { return new api.GraphIterator(this) },
    toArray: function() { return this.graph.slice() }
  };
  /**
   * SlowGraph implements RDFGraph
   */
  api.SlowGraph = function(a) {
    this.length = 0;
    this.graph = new Array
    if(Array.isArray(a)) this.importArray(a);
  };
  api.SlowGraph.prototype = {
    length: null, graph: null,
    importArray: function(a) { while( a.length > 0) { this.add(a.pop()) } },
    get: function(index) { return this.graph[index] },
    add: function(triple) {
      if(this.graph.some(function(t){ return t.equals(triple); } )) { return }
      this.length++;
      this.graph.push(triple)
    },
    merge: function(s) {
      var _g1 = 0, _g = s.length;
      while(_g1 < _g) {
        var i = _g1++;
        this.add(s.get(i))
      }
    },
    every: function(filter) { return this.graph.every(filter) },
    some: function(filter) { return this.graph.some(filter) },
    forEach: function(callbck) { this.graph.forEach(callbck) },
    filter: function(filter) { return new api.SlowGraph(this.graph.filter(filter)); },
    apply: function(filter) { this.graph = this.graph.filter(filter); this.length = this.graph.length; },
    iterator: function() { return new api.GraphIterator(this) },
    toArray: function() { return this.graph.slice() }
  };
  /**
   * GraphIterator
   */
  api.GraphIterator = function(graph) { this.graph = graph; this.cur = 0 };
  api.GraphIterator.prototype = {
    cur: null, graph: null,
    hasNext: function() { return this.cur < this.graph.length },
    next: function() { return this.graph.get(this.cur++) }
  };
  /**
   * Context implements DataContext
   */
  api.Context = function() {
    this.curieMap = new api.Hash;
    this.converterMap = new api.Hash;
    this._loadDefaultPrefixMap();
    this._loadDefaultTypeConverters()
  };
  api.Context.prototype = {
    base: null, converterMap: null, curieMap: null,
    createBlankNode: function() { return new api.BlankNode },
    createIRI: function(iri) {
      var resolved = new api.IRI(iri);
      if(resolved.scheme() == null && this.base != null) { resolved = this.base.resolveReference(resolved) }
      return resolved
    },
    createPlainLiteral: function(value, language) { return new api.PlainLiteral(value, language) },
    createTypedLiteral: function(value, type) {
      type = this._resolveType(type);
      return new api.TypedLiteral(value, this.createIRI(type))
    },
    createTriple: function(s, p, o) { return new api.RDFTriple(s, p, o) },
    createGraph: function(a) { return new api.Graph(a) },
    
    getMapping: function() { return this.curieMap },
    setMapping: function(prefix, iri) {
      if(prefix.slice(-1) == ":") { prefix = prefix.slice(0, -1) }
      var prefixIRI = new api.IRI(iri);
      this.curieMap.set(prefix.toLowerCase(), prefixIRI);
      return function(suffix) { return new api.IRI(prefixIRI.toString().concat(suffix)) }
    },
    resolveCurie: function(curie) {
      var index = curie.indexOf(":");
      if(index < 0) { return null }
      var prefix = curie.slice(0, index).toLowerCase();
      var iri = this.curieMap.get(prefix);
      if(iri == null) { return null }
      var resolved = new api.IRI(iri.value.concat(curie.slice(++index)));
      if(resolved.scheme() == null && this.base != null) { resolved = this.base.resolveReference(resolved) }
      return resolved
    },
    
    convertTypedLiteral: function(tl) {
      var converter = this.converterMap.get(tl.type.toString());
      if(converter != null) {
        try {
          return converter(tl.value, tl.type)
        } catch(e) { }
      }
      return tl;
    },
    registerTypeConversion: function(iri, converter) {
      var type = this._resolveType(iri);
      var oldConverter = this.converterMap.get(type);
      this.converterMap.remove(type);
      if(converter != null) this.converterMap.set(type, converter);
      return oldConverter ? oldConverter : null;
    },
    
    _resolveType: function(type) {
      if(type.slice(0, 2) == "^^") { type = type.slice(2) }
      var resolved = type.substring(0, 3) == "xsd" ? this.resolveCurie(type) : this.createIRI(type);
      return resolved == null ? type : resolved.value
    },
    _loadDefaultTypeConverters: function() {
      var stringConverter = function(value, inputType) { return new String(value) };
      this.registerTypeConversion("xsd:string", stringConverter);
      var booleanConverter = function(value, inputType) { return(new Boolean(value)).valueOf() };
      this.registerTypeConversion("xsd:boolean", booleanConverter);
      var numberConverter = function(value, inputType) { return(new Number(value)).valueOf() };
      this.registerTypeConversion("xsd:float", numberConverter);
      this.registerTypeConversion("xsd:integer", numberConverter);
      this.registerTypeConversion("xsd:long", numberConverter);
      this.registerTypeConversion("xsd:double", numberConverter);
      this.registerTypeConversion("xsd:decimal", numberConverter);
      this.registerTypeConversion("xsd:nonPositiveInteger", numberConverter);
      this.registerTypeConversion("xsd:nonNegativeInteger", numberConverter);
      this.registerTypeConversion("xsd:negativeInteger", numberConverter);
      this.registerTypeConversion("xsd:int", numberConverter);
      this.registerTypeConversion("xsd:unsignedLong", numberConverter);
      this.registerTypeConversion("xsd:positiveInteger", numberConverter);
      this.registerTypeConversion("xsd:short", numberConverter);
      this.registerTypeConversion("xsd:unsignedInt", numberConverter);
      this.registerTypeConversion("xsd:byte", numberConverter);
      this.registerTypeConversion("xsd:unsignedShort", numberConverter);
      this.registerTypeConversion("xsd:unsignedByte", numberConverter);
      var dateConverter = function(value, inputType) { return new Date(value) };
      this.registerTypeConversion("xsd:date", dateConverter);
      this.registerTypeConversion("xsd:time", dateConverter);
      this.registerTypeConversion("xsd:dateTime", dateConverter)
    },
    _loadDefaultPrefixMap: function() {
      this.setMapping("owl", "http://www.w3.org/2002/07/owl#");
      this.setMapping("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
      this.setMapping("rdfs", "http://www.w3.org/2000/01/rdf-schema#");
      this.setMapping("rdfa", "http://www.w3.org/ns/rdfa#");
      this.setMapping("xhv", "http://www.w3.org/1999/xhtml/vocab#");
      this.setMapping("xml", "http://www.w3.org/XML/1998/namespace");
      this.setMapping("xsd", "http://www.w3.org/2001/XMLSchema#");
      this.setMapping("grddl", "http://www.w3.org/2003/g/data-view#");
      this.setMapping("powder", "http://www.w3.org/2007/05/powder#");
      this.setMapping("powders", "http://www.w3.org/2007/05/powder-s#");
      this.setMapping("rif", "http://www.w3.org/2007/rif#");
      this.setMapping("atom", "http://www.w3.org/2005/Atom/");
      this.setMapping("xhtml", "http://www.w3.org/1999/xhtml#");
      this.setMapping("formats", "http://www.w3.org/ns/formats/");
      this.setMapping("xforms", "http://www.w3.org/2002/xforms/");
      this.setMapping("xhtmlvocab", "http://www.w3.org/1999/xhtml/vocab/");
      this.setMapping("xpathfn", "http://www.w3.org/2005/xpath-functions#");
      this.setMapping("http", "http://www.w3.org/2006/http#");
      this.setMapping("link", "http://www.w3.org/2006/link#");
      this.setMapping("time", "http://www.w3.org/2006/time#");
      this.setMapping("acl", "http://www.w3.org/ns/auth/acl#");
      this.setMapping("cert", "http://www.w3.org/ns/auth/cert#");
      this.setMapping("rsa", "http://www.w3.org/ns/auth/rsa#");
      this.setMapping("crypto", "http://www.w3.org/2000/10/swap/crypto#");
      this.setMapping("list", "http://www.w3.org/2000/10/swap/list#");
      this.setMapping("log", "http://www.w3.org/2000/10/swap/log#");
      this.setMapping("math", "http://www.w3.org/2000/10/swap/math#");
      this.setMapping("os", "http://www.w3.org/2000/10/swap/os#");
      this.setMapping("string", "http://www.w3.org/2000/10/swap/string#");
      this.setMapping("doc", "http://www.w3.org/2000/10/swap/pim/doc#");
      this.setMapping("contact", "http://www.w3.org/2000/10/swap/pim/contact#");
      this.setMapping("p3p", "http://www.w3.org/2002/01/p3prdfv1#");
      this.setMapping("swrl", "http://www.w3.org/2003/11/swrl#");
      this.setMapping("swrlb", "http://www.w3.org/2003/11/swrlb#");
      this.setMapping("exif", "http://www.w3.org/2003/12/exif/ns#");
      this.setMapping("earl", "http://www.w3.org/ns/earl#");
      this.setMapping("ma", "http://www.w3.org/ns/ma-ont#");
      this.setMapping("sawsdl", "http://www.w3.org/ns/sawsdl#");
      this.setMapping("sd", "http://www.w3.org/ns/sparql-service-description#");
      this.setMapping("skos", "http://www.w3.org/2004/02/skos/core#");
      this.setMapping("fresnel", "http://www.w3.org/2004/09/fresnel#");
      this.setMapping("gen", "http://www.w3.org/2006/gen/ont#");
      this.setMapping("timezone", "http://www.w3.org/2006/timezone#");
      this.setMapping("skosxl", "http://www.w3.org/2008/05/skos-xl#");
      this.setMapping("org", "http://www.w3.org/ns/org#");
      this.setMapping("ical", "http://www.w3.org/2002/12/cal/ical#");
      this.setMapping("wgs84", "http://www.w3.org/2003/01/geo/wgs84_pos#");
      this.setMapping("vcard", "http://www.w3.org/2006/vcard/ns#");
      this.setMapping("turtle", "http://www.w3.org/2008/turtle#");
      this.setMapping("pointers", "http://www.w3.org/2009/pointers#");
      this.setMapping("dcat", "http://www.w3.org/ns/dcat#");
      this.setMapping("imreg", "http://www.w3.org/2004/02/image-regions#");
      this.setMapping("rdfg", "http://www.w3.org/2004/03/trix/rdfg-1/");
      this.setMapping("swp", "http://www.w3.org/2004/03/trix/swp-2/");
      this.setMapping("rei", "http://www.w3.org/2004/06/rei#");
      this.setMapping("wairole", "http://www.w3.org/2005/01/wai-rdf/GUIRoleTaxonomy#");
      this.setMapping("states", "http://www.w3.org/2005/07/aaa#");
      this.setMapping("wn20schema", "http://www.w3.org/2006/03/wn/wn20/schema/");
      this.setMapping("httph", "http://www.w3.org/2007/ont/httph#");
      this.setMapping("act", "http://www.w3.org/2007/rif-builtin-action#");
      this.setMapping("common", "http://www.w3.org/2007/uwa/context/common.owl#");
      this.setMapping("dcn", "http://www.w3.org/2007/uwa/context/deliverycontext.owl#");
      this.setMapping("hard", "http://www.w3.org/2007/uwa/context/hardware.owl#");
      this.setMapping("java", "http://www.w3.org/2007/uwa/context/java.owl#");
      this.setMapping("loc", "http://www.w3.org/2007/uwa/context/location.owl#");
      this.setMapping("net", "http://www.w3.org/2007/uwa/context/network.owl#");
      this.setMapping("push", "http://www.w3.org/2007/uwa/context/push.owl#");
      this.setMapping("soft", "http://www.w3.org/2007/uwa/context/software.owl#");
      this.setMapping("web", "http://www.w3.org/2007/uwa/context/web.owl#");
      this.setMapping("content", "http://www.w3.org/2008/content#");
      this.setMapping("vs", "http://www.w3.org/2003/06/sw-vocab-status/ns#");
      this.setMapping("air", "http://dig.csail.mit.edu/TAMI/2007/amord/air#");
      this.setMapping("ex", "http://example.org/");
      this.setMapping("dc", "http://purl.org/dc/terms/");
      this.setMapping("dc11", "http://purl.org/dc/elements/1.1/");
      this.setMapping("dctype", "http://purl.org/dc/dcmitype/");
      this.setMapping("foaf", "http://xmlns.com/foaf/0.1/");
      this.setMapping("cc", "http://creativecommons.org/ns#");
      this.setMapping("opensearch", "http://a9.com/-/spec/opensearch/1.1/");
      this.setMapping("void", "http://rdfs.org/ns/void#");
      this.setMapping("sioc", "http://rdfs.org/sioc/ns#");
      this.setMapping("sioca", "http://rdfs.org/sioc/actions#");
      this.setMapping("sioct", "http://rdfs.org/sioc/types#");
      this.setMapping("lgd", "http://linkedgeodata.org/vocabulary#");
      this.setMapping("moat", "http://moat-project.org/ns#");
      this.setMapping("days", "http://ontologi.es/days#");
      this.setMapping("giving", "http://ontologi.es/giving#");
      this.setMapping("lang", "http://ontologi.es/lang/core#");
      this.setMapping("like", "http://ontologi.es/like#");
      this.setMapping("status", "http://ontologi.es/status#");
      this.setMapping("og", "http://opengraphprotocol.org/schema/");
      this.setMapping("protege", "http://protege.stanford.edu/system#");
      this.setMapping("dady", "http://purl.org/NET/dady#");
      this.setMapping("uri", "http://purl.org/NET/uri#");
      this.setMapping("audio", "http://purl.org/media/audio#");
      this.setMapping("video", "http://purl.org/media/video#");
      this.setMapping("gridworks", "http://purl.org/net/opmv/types/gridworks#");
      this.setMapping("hcterms", "http://purl.org/uF/hCard/terms/");
      this.setMapping("bio", "http://purl.org/vocab/bio/0.1/");
      this.setMapping("cs", "http://purl.org/vocab/changeset/schema#");
      this.setMapping("geographis", "http://telegraphis.net/ontology/geography/geography#");
      this.setMapping("doap", "http://usefulinc.com/ns/doap#");
      this.setMapping("daml", "http://www.daml.org/2001/03/daml+oil#");
      this.setMapping("geonames", "http://www.geonames.org/ontology#");
      this.setMapping("sesame", "http://www.openrdf.org/schema/sesame#");
      this.setMapping("cv", "http://rdfs.org/resume-rdf/");
      this.setMapping("wot", "http://xmlns.com/wot/0.1/");
      this.setMapping("media", "http://purl.org/microformat/hmedia/");
      this.setMapping("ctag", "http://commontag.org/ns#")
    }
  };
  api.data = new api.Data;
  return api;
}();
