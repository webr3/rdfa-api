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
    this.curieMap = new Hash;
    this.converterMap = new Hash;
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
      if(type == this._resolveType('xsd:string')) return this.createPlainLiteral(value);
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
  return api;
}();
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
/**
 * Parsers (NTriples, Turtle, RDF/XML)
 */
(function(api) {
  if(!api.parsers) { api.parsers = {} }
  api.parsers.u8 = new RegExp("\\\\U([A-F0-9]{8})", "g");
  api.parsers.u4 = new RegExp("\\\\u([A-F0-9]{4})", "g");
  api.parsers.hexToChar = function(hex) {
    var result = "";
    var n = parseInt(hex, 16);
    if(n <= 65535) {
      result += String.fromCharCode(n)
    } else if(n <= 1114111) {
      n -= 65536;
      result += String.fromCharCode(55296 + (n >> 10), 56320 + (n & 1023))
    } else { throw new Error("code point isn't known: " + n); }
    return result
  };
  api.parsers.decodeString = function(str) {
    str = str.replace(api.parsers.u8, function(matchstr, parens) { return api.parsers.hexToChar(parens) });
    str = str.replace(api.parsers.u4, function(matchstr, parens) { return api.parsers.hexToChar(parens) });
    str = str.replace(new RegExp("\\\\t", "g"), "\t");
    str = str.replace(new RegExp("\\\\n", "g"), "\n");
    str = str.replace(new RegExp("\\\\r", "g"), "\r");
    str = str.replace(new RegExp('\\\\"', "g"), '"');
    str = str.replace(new RegExp("\\\\\\\\", "g"), "\\");
    return str
  };
  /**
   * NTriples implements DataParser
   * doc param of parse() and process() must be a string
   */
  api.parsers.NTriples = function(context) {
    this.context = context;
    this.bnHash = new Hash
  };
  api.parsers.NTriples.isComment = new RegExp("^[ \t]*#", "");
  api.parsers.NTriples.isEmptyLine = new RegExp("^[ \t]*$", "");
  api.parsers.NTriples.initialWhitespace = new RegExp("^[ \t]+", "");
  api.parsers.NTriples.trailingWhitespace = new RegExp("[. \t]+$", "");
  api.parsers.NTriples.whitespace = new RegExp("[ \t]+", "");
  api.parsers.NTriples.objectMatcher = new RegExp("^([^ \t]+)[ \t]+([^ \t]+)[ \t]+(.*)$", "");
  api.parsers.NTriples.trailingLanguage = new RegExp("@([a-z]+[-a-z0-9]+)$", "");
  api.parsers.NTriples.typedLiteralMatcher = new RegExp('^"(.*)"(.{2})<([^>]+)>$', "");
  api.parsers.NTriples.eolMatcher = new RegExp("\r\n|\n|\r", "g");
  api.parsers.NTriples.prototype = {
    context: null, quick: null, bnHash: null, graph: null, filter: null, processor: null,
    parse: function(toparse, cb, filter, graph) {
      this.graph = graph == null ? this.context.createGraph() : graph;
      this.filter = filter;
      this.quick = false;
      this.internalParse(toparse);
      if(cb != null) cb(this.graph);      
      return true;
    },
    process: function(toparse, processor, filter) {
      this.processor = processor;
      this.filter = filter;
      this.quick = true;
      return this.internalParse(toparse)
    },
    getBlankNode: function(id) {
      if(this.bnHash.exists(id)) { return this.bnHash.get(id) }
      var bn = this.context.createBlankNode();
      this.bnHash.set(id, bn);
      return bn
    },
    internalParse: function(toparse) {
      var data = new String(toparse);
      var lines = data.split(api.parsers.NTriples.eolMatcher);
      var _ = this;
      lines.forEach(function(a, b, c) { _.readLine(a, b, c) });
      return true
    },
    negotiateLiteral: function(plain) {
      if(plain.slice(-1) == '"') { return this.context.createPlainLiteral(api.parsers.decodeString(plain.slice(1, -1))) }
      var lang = plain.match(api.parsers.NTriples.trailingLanguage);
      if(lang != null) { return this.context.createPlainLiteral(api.parsers.decodeString(plain.slice(1, -1 - lang.shift().length)), lang.pop()) }
      var parts = plain.match(api.parsers.NTriples.typedLiteralMatcher);
      return this.context.createTypedLiteral(api.parsers.decodeString(parts[1]), parts.pop())
    },   
    readLine: function(line, index, array) {
      if(api.parsers.NTriples.isComment.test(line) || api.parsers.NTriples.isEmptyLine.test(line)) { return }
      line = line.replace(api.parsers.NTriples.initialWhitespace, "").replace(api.parsers.NTriples.trailingWhitespace, "");
      var spo = line.split(api.parsers.NTriples.whitespace, 2);
      spo.push(line.replace(api.parsers.NTriples.objectMatcher, "$3"));
      var s;
      if(spo[0].charAt(0) == "<") {
        s = this.context.createIRI(api.parsers.decodeString(spo[0].slice(1, -1)))
      }else {
        s = this.getBlankNode(spo[0].slice(2))
      }
      spo.shift();
      var p = this.context.createIRI(spo.shift().slice(1, -1));
      var o;
      switch(spo[0].charAt(0)) {
        case "<":
          o = this.context.createIRI(api.parsers.decodeString(spo[0].slice(1, -1)));
          break;
        case "_":
          o = this.getBlankNode(spo[0].slice(2));
          break;
        default:
          o = this.negotiateLiteral(spo[0]);
          break
      }
      var triple = this.context.createTriple(s, p, o);
      var $use = true;
      if(this.filter != null) { $use = this.filter(triple, null, null) }
      if(!$use) { return; }
      this.quick ? this.processor(triple) : this.graph.add(triple);
    }
  };
  /**
   * Turtle implements DataParser
   * doc param of parse() and process() must be a string
   */
  api.parsers.Turtle = function(context) {
    this.context = context;
    this.bnHash = new Hash
  };
  api.parsers.Turtle.isWhitespace = new RegExp("^[ \t\r\n#]+", "");
  api.parsers.Turtle.initialWhitespace = new RegExp("^[ \t\r\n]+", "");
  api.parsers.Turtle.initialComment = new RegExp("^#[^\r\n]*", "");
  api.parsers.Turtle.simpleToken = new RegExp("^[^ \t\r\n]+", "");
  api.parsers.Turtle.simpleObjectToken = new RegExp("^[^ \t\r\n;,]+", "");
  api.parsers.Turtle.tokenInteger = new RegExp("^(-|\\+)?[0-9]+$", "");
  api.parsers.Turtle.tokenDouble = new RegExp("^(-|\\+)?(([0-9]+\\.[0-9]*[eE]{1}(-|\\+)?[0-9]+)|(\\.[0-9]+[eE]{1}(-|\\+)?[0-9]+)|([0-9]+[eE]{1}(-|\\+)?[0-9]+))$", "");
  api.parsers.Turtle.tokenDecimal = new RegExp("^(-|\\+)?[0-9]*\\.[0-9]+?$", "");  
  api.parsers.Turtle.prototype = {
    bnHash: null, context: null, filter: null, processor: null, quick: null, graph: null,
    parse: function(doc, cb, filter, graph) {
      this.graph = graph == null ? this.context.createGraph() : graph;
      this.filter = filter;
      this.quick = false;
      this.parseStatements(new String(doc));
      if(cb != null) cb(this.graph);      
      return true;
    },
    process: function(doc, processor, filter) {
      this.processor = processor; this.filter = filter; this.quick = true;
      return this.parseStatements(new String(doc))
    },
    t: function() { return{o:null} },
    parseStatements: function(s) {
      s = s.toString();
      while(s.length > 0) {
        s = this.skipWS(s);
        if(s.length == 0) return true;
        s.charAt(0) == "@" ? s = this.consumeDirective(s) : s = this.consumeStatement(s);
        this.expect(s, ".");
        s = this.skipWS(s.slice(1))
      }
      return true
    },
    add: function(t) {
      var $use = true;
      if(this.filter != null) {  $use = this.filter(t, null, null) }
      if(!$use) { return }
      this.quick ? this.processor(t) : this.graph.add(t);
    },
    consumeBlankNode: function(s, t) {
      t.o = this.context.createBlankNode();
      s = this.skipWS(s.slice(1));
      if(s.charAt(0) == "]") { return s.slice(1) }
      s = this.skipWS(this.consumePredicateObjectList(s, t));
      this.expect(s, "]");
      return this.skipWS(s.slice(1))
    },
    consumeCollection: function(s, subject) {
      subject.o = this.context.createBlankNode();
      var listject = this.t();
      listject.o = subject.o;
      s = this.skipWS(s.slice(1));
      var cont = s.charAt(0) != ")";
      if(!cont) { subject.o = this.context.resolveCurie("rdf:nil") }
      while(cont) {
        var o = this.t();
        switch(s.charAt(0)) {
          case "[": s = this.consumeBlankNode(s, o); break;
          case "_": s = this.consumeKnownBlankNode(s, o); break;
          case "(": s = this.consumeCollection(s, o); break;
          case "<": s = this.consumeURI(s, o); break;
          case '"': s = this.consumeLiteral(s, o); break;
          default:
            var token = s.match(api.parsers.Turtle.simpleObjectToken).shift();
            if(token.charAt(token.length - 1) == ")") { token = token.substring(0, token.length - 1) }
            if(token == "false" || token == "true") {
              o.o = this.context.createTypedLiteral(token, "xsd:boolean")
            } else if(token.indexOf(":") > -1) {
              o.o = this.context.resolveCurie(token)
            } else if(api.parsers.Turtle.tokenInteger.test(token)) {
              o.o = this.context.createTypedLiteral(token, "xsd:integer")
            } else if(api.parsers.Turtle.tokenDouble.test(token)) {
              o.o = this.context.createTypedLiteral(token, "xsd:double")
            } else if(api.parsers.Turtle.tokenDecimal.test(token)) {
              o.o = this.context.createTypedLiteral(token, "xsd:decimal")
            } else {
              throw new Error("unrecognised token: " + token);
            }
            s = s.slice(token.length);
            break
        }
        this.add(this.context.createTriple(listject.o, this.context.resolveCurie("rdf:first"), o.o));
        s = this.skipWS(s);
        cont = s.charAt(0) != ")";
        if(cont) {
          this.add(this.context.createTriple(listject.o, this.context.resolveCurie("rdf:rest"), listject.o = this.context.createBlankNode()))
        } else {
          this.add(this.context.createTriple(listject.o, this.context.resolveCurie("rdf:rest"), this.context.resolveCurie("rdf:nil")))
        }
      }
      return this.skipWS(s.slice(1))
    },
    consumeDirective: function(s) {
      var p = 0;
      if(s.substring(1, 7) == "prefix") {
        s = this.skipWS(s.slice(7));
        p = s.indexOf(":");
        var prefix = s.substring(0, p);
        s = this.skipWS(s.slice(++p));
        this.expect(s, "<");
        this.context.setMapping(prefix, api.parsers.decodeString(s.substring(1, p = s.indexOf(">"))));
        s = this.skipWS(s.slice(++p))
      } else if(s.substring(1, 5) == "base") {
        s = this.skipWS(s.slice(5));
        this.expect(s, "<");
        this.context.base = this.context.createIRI(api.parsers.decodeString(s.substring(1, p = s.indexOf(">"))));
        s = this.skipWS(s.slice(++p))
      } else {
        throw new Error("Unknown directive: " + s.substring(0, 50));
      }
      return s
    },
    consumeKnownBlankNode: function(s, t) {
      this.expect(s, "_:");
      var bname = s.slice(2).match(api.parsers.Turtle.simpleToken).shift();
      t.o = this.getBlankNode(bname);
      return s.slice(bname.length + 2)
    },
    consumeLiteral: function(s, o) {
      var value = "";
      var hunt = true;
      var end = 0;
      if(s.substring(0, 3) == '"""') {
        end = 3;
        while(hunt) {
          end = s.indexOf('"""', end);
          if(hunt = s.charAt(end - 1) == "\\") { end++ }
        }
        value = s.substring(3, end);
        s = s.slice(value.length + 6)
      } else {
        while(hunt) {
          end = s.indexOf('"', end + 1);
          hunt = s.charAt(end - 1) == "\\"
        }
        value = s.substring(1, end);
        s = s.slice(value.length + 2)
      }
      value = api.parsers.decodeString(value);
      switch(s.charAt(0)) {
        case "@":
          var token = s.match(api.parsers.Turtle.simpleObjectToken).shift();
          o.o = this.context.createPlainLiteral(value, token.slice(1));
          s = s.slice(token.length);
          break;
        case "^":
          var token = s.match(api.parsers.Turtle.simpleObjectToken).shift().slice(2);
          if(token.charAt(0) == "<") {
            o.o = this.context.createTypedLiteral(value, token.substring(1, token.length - 1))
          } else {
            o.o = this.context.createTypedLiteral(value, token)
          }
          s = s.slice(token.length + 2);
          break;
        default:
          o.o = this.context.createPlainLiteral(value);
          break
      }
      return s
    },
    consumeObjectList: function(s, subject, property) {
      var cont = true;
      while(cont) {
        var o = this.t();
        switch(s.charAt(0)) {
          case "[": s = this.consumeBlankNode(s, o); break;
          case "_": s = this.consumeKnownBlankNode(s, o); break;
          case "(": s = this.consumeCollection(s, o); break;
          case "<": s = this.consumeURI(s, o); break;
          case '"': s = this.consumeLiteral(s, o); break;
          default:
            var token = s.match(api.parsers.Turtle.simpleObjectToken).shift();
            if(token.charAt(token.length - 1) == ".") {
              token = token.substring(0, token.length - 1)
            }
            if(token == "false" || token == "true") {
              o.o = this.context.createTypedLiteral(token, "xsd:boolean")
            } else if(token.indexOf(":") > -1) {
              o.o = this.context.resolveCurie(token)
            } else if(api.parsers.Turtle.tokenInteger.test(token)) {
              o.o = this.context.createTypedLiteral(token, "xsd:integer")
            } else if(api.parsers.Turtle.tokenDouble.test(token)) {
              o.o = this.context.createTypedLiteral(token, "xsd:double")
            } else if(api.parsers.Turtle.tokenDecimal.test(token)) {
              o.o = this.context.createTypedLiteral(token, "xsd:decimal")
            } else {
              throw new Error("unrecognised token: " + token);
            }
            s = s.slice(token.length);
            break
        }
        this.add(this.context.createTriple(subject.o, property, o.o));
        s = this.skipWS(s);
        cont = s.charAt(0) == ",";
        if(cont) { s = this.skipWS(s.slice(1)) }
      }
      return s
    },
    consumePredicateObjectList: function(s, subject) {
      var cont = true;
      while(cont) {
        var predicate = s.match(api.parsers.Turtle.simpleToken).shift();
        var property = null;
        if(predicate == "a") {
          property = this.context.resolveCurie("rdf:type")
        } else {
          switch(predicate.charAt(0)) {
            case "<": property = this.context.createIRI(api.parsers.decodeString(predicate.substring(1, predicate.indexOf(">")))); break;
            default: property = this.context.resolveCurie(predicate); break
          }
        }
        s = this.skipWS(s.slice(predicate.length));
        s = this.consumeObjectList(s, subject, property);
        cont = s.charAt(0) == ";";
        if(cont) { s = this.skipWS(s.slice(1)) }
      }
      return s
    },
    consumeQName: function(s, t) {
      var qname = s.match(api.parsers.Turtle.simpleToken).shift();
      t.o = this.context.resolveCurie(qname);
      return s.slice(qname.length)
    },
    consumeStatement: function(s) {
      var t = this.t();
      switch(s.charAt(0)) {
        case "[":
          s = this.consumeBlankNode(s, t);
          if(s.charAt(0) == ".") { return s }
          break;
        case "_": s = this.consumeKnownBlankNode(s, t); break;
        case "(": s = this.consumeCollection(s, t); break;
        case "<": s = this.consumeURI(s, t); break;
        default: s = this.consumeQName(s, t); break
      }
      s = this.consumePredicateObjectList(this.skipWS(s), t);
      return s
    },
    consumeURI: function(s, t) {
      this.expect(s, "<");
      var p = 0;
      t.o = this.context.createIRI(api.parsers.decodeString(s.substring(1, p = s.indexOf(">"))));
      return s.slice(++p)
    },
    expect: function(s, t) {
      if(s.substring(0, t.length) == t) { return }
      throw new Error("Expected token: " + t + " at " + s.substring(0, 50));
    },
    getBlankNode: function(id) {
      if(this.bnHash.exists(id)) { return this.bnHash.get(id) }
      var bn = this.context.createBlankNode();
      this.bnHash.set(id, bn);
      return bn
    },   
    skipWS: function(s) {
      while(api.parsers.Turtle.isWhitespace.test(s.charAt(0))) {
        s = s.replace(api.parsers.Turtle.initialWhitespace, "");
        if(s.charAt(0) == "#") { s = s.replace(api.parsers.Turtle.initialComment, "") }
      }
      return s
    }
  };
  /**
   * RDFXML implements DataParser
   * doc argument of parse() and process() must be a DOM document
   */
  api.parsers.RDFXML = function(context) {
    this.context = context;
    this.bnHash = new Hash
  };
  api.parsers.RDFXML.NS_RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  api.parsers.RDFXML.NS_RDFS = "http://www.w3.org/2000/01/rdf-schema#";
  api.parsers.RDFXML.RDF_TYPE = new api.IRI(api.parsers.RDFXML.NS_RDF + "type");
  api.parsers.RDFXML.RDF_RDF = new api.IRI(api.parsers.RDFXML.NS_RDF + "RDF");
  api.parsers.RDFXML.RDF_DESCRIPTION = new api.IRI(api.parsers.RDFXML.NS_RDF + "Description");
  api.parsers.RDFXML.RDF_STATEMENT = new api.IRI(api.parsers.RDFXML.NS_RDF + "Statement");
  api.parsers.RDFXML.RDF_SUBJECT = new api.IRI(api.parsers.RDFXML.NS_RDF + "subject");
  api.parsers.RDFXML.RDF_PREDICATE = new api.IRI(api.parsers.RDFXML.NS_RDF + "predicate");
  api.parsers.RDFXML.RDF_OBJECT = new api.IRI(api.parsers.RDFXML.NS_RDF + "object");
  api.parsers.RDFXML.RDF_LI = new api.IRI(api.parsers.RDFXML.NS_RDF + "li");
  api.parsers.RDFXML.RDF_FIRST = new api.IRI(api.parsers.RDFXML.NS_RDF + "first");
  api.parsers.RDFXML.RDF_REST = new api.IRI(api.parsers.RDFXML.NS_RDF + "rest");
  api.parsers.RDFXML.RDF_NIL = new api.IRI(api.parsers.RDFXML.NS_RDF + "nil");
  api.parsers.RDFXML.prototype = {
    base: null, bnHash: null, context: null, filter: null, processor: null, quick: null, graph: null,
    parse: function(toparse, cb, filter, graph) {
      this.graph = graph == null ? new api.Graph : graph;
      this.filter = filter;
      this.quick = false;
      this.parseStatements(toparse)
      if( cb != null ) cb(this.graph)
      return;
    },
    process: function(doc, processor, filter) {
      this.processor = processor;
      this.filter = filter;
      this.quick = true;
      return this.parseStatements(doc)
    },
    add: function(t) {
      var $use = true;
      if(this.filter != null) $use = this.filter(t, null, null);
      if(!$use) return;
      this.quick ? this.processor(t) : this.graph.add(t);
    },
    addArc: function(frame, arc) {
      if(arc.equals(api.parsers.RDFXML.RDF_LI)) arc = this.context.resolveCurie("rdf:_" + frame.parent.listIndex++)
      this.addSymbol(frame, 2, arc.toString())
    },
    addBNode: function(frame, s) {
      s != null ? frame.node = this.getBlankNode(s) : frame.node = this.context.createBlankNode();
      frame.nodeType = 1;
      if(this.isTripleToLoad(frame)) this.addFrame(frame);
    },
    addCollection: function(frame) {
      frame.collection = true;
      this.addBNode(frame)
    },
    addFrame: function(frame) {
      this.add(this.createTriple(frame.parent.parent.node, frame.parent.node, frame.node));
      if(frame.rdfid != null || frame.parent.rdfid != null) {
        if(frame.parent.rdfid != null && frame.rdfid == null) frame.rdfid = frame.parent.rdfid;
        var s = frame.base.resolveReference("#".concat(frame.rdfid));
        this.add(this.createTriple(s, api.parsers.RDFXML.RDF_TYPE, api.parsers.RDFXML.RDF_STATEMENT));
        this.add(this.createTriple(s, api.parsers.RDFXML.RDF_SUBJECT, frame.parent.parent.node));
        this.add(this.createTriple(s, api.parsers.RDFXML.RDF_PREDICATE, frame.parent.node));
        this.add(this.createTriple(s, api.parsers.RDFXML.RDF_OBJECT, frame.node))
      }
    },
    addLiteral: function(frame, value) {
      frame.nodeType = 1;
      if(frame.parent.datatype != null) {
        frame.node = this.context.createTypedLiteral(value == null ? frame.element.nodeValue : value, frame.parent.datatype)
      } else {
        frame.node = this.context.createPlainLiteral(value == null ? frame.element.nodeValue : value, frame.lang)
      }
      if(this.isTripleToLoad(frame)) this.addFrame(frame)
    },
    addNode: function(frame, s) {
      this.addSymbol(frame, 1, s);
      if(this.isTripleToLoad(frame)) this.addFrame(frame)
    },
    addSymbol: function(frame, nodeType, val) {
      frame.node = frame.base.resolveReference(val);
      frame.nodeType = nodeType
    },
    buildFrame: function(parent, element) {
      var frame = {parent:parent, element:element, lastChild:0, base:null, lang:null, node:null, nodeType:null, listIndex:1, rdfid:null, datatype:null, collection:false};
      if(parent != null) {
        frame.base = parent.base;
        frame.lang = parent.lang
      }
      if(element == null || element.nodeType == 3 || element.nodeType == 4) return frame
      var d = element.getAttributeNode("xml:base");
      if(d != null) {
        frame.base = this.context.createIRI(d.nodeValue);
        element.removeAttribute("xml:base")
      }
      d = element.getAttributeNode("xml:lang");
      if(d != null) {
        frame.lang = d.nodeValue;
        element.removeAttribute("xml:lang")
      }
      var a = element.attributes;
      var i = a.length - 1;
      while(i > -1) {
        if(a.item(i).nodeName.substring(0, 3) == "xml") {
          if(a.item(i).name.substring(0, 6) == "xmlns:") {
            var c = a.item(i).nodeValue;
            if(this.base != null) {
              c = this.base.resolveReference(c).toString()
            }
            this.context.setMapping(a.item(i).name.slice(6), c)
          }
          element.removeAttributeNode(a.item(i))
        }
        i--
      }
      return frame
    },
    createTriple: function(s, p, o) { return this.context.createTriple(s, p, o) },
    getBlankNode: function(id) {
      if(this.bnHash.exists(id)) return this.bnHash.get(id)
      var bn = this.context.createBlankNode();
      this.bnHash.set(id, bn);
      return bn
    },
    isTripleToLoad: function(frame) {
      return frame.parent != null && frame.parent.parent != null && frame.nodeType == 1 && frame.parent.nodeType == 2 && frame.parent.parent.nodeType == 1
    },
    parseDOM: function(frame) {
      var dig = true;
      while(frame.parent != null) {
        var e = frame.element;
        if(e.nodeType == 3 || e.nodeType == 4) {
          this.addLiteral(frame)
        }else {
          if(!api.parsers.RDFXML.RDF_RDF.equals(this.resolveNamespaceURI(e))) {
            if(frame.parent != null && frame.parent.collection) {
              frame.parent.listIndex++;
              this.addArc(frame, api.parsers.RDFXML.RDF_FIRST);
              frame = this.buildFrame(frame, frame.element);
              frame.parent.element = null
            }
            if(frame.parent == null || frame.parent.nodeType == null || frame.parent.nodeType == 2) {
              var about = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "about");
              var rdfid = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "ID");
              if(about != null && rdfid != null) {
                throw new Error("RDFParser: " + e.nodeName + " has both rdf:id and rdf:about, only one may be specified");
              }
              if(about == null && rdfid != null) {
                this.addNode(frame, "#" + rdfid.nodeValue);
                e.removeAttributeNode(rdfid)
              }else {
                if(about == null && rdfid == null) {
                  if((about = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "nodeID")) != null) {
                    this.addBNode(frame, about.nodeValue);
                    e.removeAttributeNode(about)
                  }else {
                    this.addBNode(frame)
                  }
                }else {
                  this.addNode(frame, about.nodeValue);
                  e.removeAttributeNode(about)
                }
              }
              about = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "type");
              if(!this.resolveNamespaceURI(e).equals(api.parsers.RDFXML.RDF_DESCRIPTION)) {
                about = {nodeValue:this.resolveNamespaceURI(e)}
              }
              if(about != null) {
                this.add(this.createTriple(frame.node, api.parsers.RDFXML.RDF_TYPE, frame.base.resolveReference(about.nodeValue)));
                if(about.nodeName != null) {
                  e.removeAttributeNode(about)
                }
              }
              var f = e.attributes.length - 1;
              while(f > -1) {
                this.add(this.createTriple(frame.node, this.resolveNamespaceURI(e.attributes.item(f)), this.context.createPlainLiteral(e.attributes.item(f).nodeValue, frame.lang)));
                f--
              }
            }else {
              this.addArc(frame, this.resolveNamespaceURI(e));
              var rdfid = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "ID");
              if(rdfid != null) {
                frame.rdfid = rdfid.nodeValue;
                e.removeAttributeNode(rdfid)
              }
              var datatype = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "datatype");
              if(datatype != null) {
                frame.datatype = datatype.nodeValue;
                e.removeAttributeNode(datatype)
              }
              var c = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "parseType");
              if(c != null) {
                switch(c.nodeValue) {
                  case "Literal":
                    frame.datatype = api.parsers.RDFXML.NS_RDF + "XMLLiteral";
                    frame = this.buildFrame(frame);
                    var xml = '';
                    var ii = 0;
                    while(ii < e.childNodes.length) {
                      var tempnode = e.childNodes.item(ii++);
                      if(tempnode.nodeType == 3) {
                        xml += tempnode.nodeValue;
                      } else {
                        xml += (new XMLSerializer).serializeToString(e.firstElementChild);
                      }
                    }
                    this.addLiteral(frame, xml);
                    dig = false;
                    break;
                  case "Resource":
                    frame = this.buildFrame(frame, frame.element);
                    frame.parent.element = null;
                    this.addBNode(frame);
                    break;
                  case "Collection":
                    frame = this.buildFrame(frame, frame.element);
                    frame.parent.element = null;
                    this.addCollection(frame);
                    break
                }
                e.removeAttributeNode(c)
              }
              if(e.attributes.length != 0) {
                var f = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "resource");
                c = e.getAttributeNodeNS(api.parsers.RDFXML.NS_RDF, "nodeID");
                frame = this.buildFrame(frame);
                if(f != null) {
                  this.addNode(frame, f.nodeValue);
                  e.removeAttributeNode(f)
                }else {
                  if(c != null) {
                    this.addBNode(frame, c.nodeValue);
                    e.removeAttributeNode(c)
                  }else {
                    this.addBNode(frame)
                  }
                }
                var i = e.attributes.length - 1;
                while(i > -1) {
                  var n = this.buildFrame(frame);
                  f = e.attributes.item(i);
                  this.addArc(n, this.resolveNamespaceURI(f));
                  if(this.resolveNamespaceURI(f).equals(api.parsers.RDFXML.RDF_TYPE)) {
                    this.addNode(this.buildFrame(n), f.nodeValue)
                  }else {
                    this.addLiteral(this.buildFrame(n), f.nodeValue)
                  }
                  i--
                }
              }else {
                if(e.childNodes.length == 0) {
                  this.addLiteral(this.buildFrame(frame), "")
                }
              }
            }
          }
        }
        e = frame.element;
        while(frame.parent != null) {
          var pf = frame;
          while(e == null) {
            frame = frame.parent;
            e = frame.element
          }
          var c = e.childNodes.item(frame.lastChild);
          if(c == null || !dig) {
            if(frame.collection) {
              this.add(this.createTriple(frame.node, api.parsers.RDFXML.RDF_REST, api.parsers.RDFXML.RDF_NIL))
            }
            if((frame = frame.parent) == null) {
              break
            }
            e = frame.element;
            dig = true
          }else {
            if(c.nodeType != 1 && c.nodeType != 3 && c.nodeType != 4 || (c.nodeType == 3 || c.nodeType == 4) && e.childNodes.length != 1) {
              frame.lastChild++
            }else {
              if(frame.collection && frame.listIndex > 1) {
                var rest = this.context.createBlankNode();
                this.add(this.createTriple(frame.node, api.parsers.RDFXML.RDF_REST, rest));
                pf.node = rest
              }
              frame.lastChild++;
              frame = this.buildFrame(pf, e.childNodes.item(frame.lastChild - 1));
              break
            }
          }
        }
      }
    },
    parseStatements: function(doc) {
      this.base = this.context.base;
      var rootFrame = this.buildFrame(null, null);
      rootFrame.base = this.base;
      this.parseDOM(this.buildFrame(rootFrame, doc.documentElement));
      return true
    },
    resolveNamespaceURI: function(e) {
      if(e.namespaceURI == null) {
        throw new Error("RDF/XML syntax error: No namespace for " + e.localName + " in " + this.base);
      }
      return this.context.createIRI(e.namespaceURI + e.localName)
    }
  };
})(rdfapi);
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
/**
 * rdfa-api extensions
 */
(function(api) {
  api.data = null;
  api.proxy = null;
  api.log = function(o) { console.log(o); };
  api.singlify = function(graph) {
    var equivs = graph.filter( api.filters.p(api.resolve('owl:sameAs')) );
    while(equivs.length > 0) {
        var rescount = {};
        api.uniqueResources(equivs).forEach( function(r) {
          rescount[r.toNT()] = api.filterCount(graph,api.filters.describes(r));
        });
        equivs.forEach( function(t) {
          if(t.subject.nodeType() == 'BlankNode' && t.object.nodeType() == 'IRI') {
            api.replace(graph, t.subject, t.object); 
          } else if(t.subject.nodeType() == 'IRI' && t.object.nodeType() == 'BlankNode') {
            api.replace(graph, t.object, t.subject); 
          } else if(rescount[t.subject.toNT()] < rescount[t.object.toNT()]) {
            api.replace(graph, t.subject, t.object);  
          } else if(rescount[t.subject.toNT()] > rescount[t.object.toNT()]) {
            api.replace(graph, t.object, t.subject);
          } else if(t.subject.nodeType() == 'IRI' && t.object.nodeType() == 'IRI') {
            if(t.subject.toString().length > t.object.toString().length) {
              api.replace(graph, t.subject, t.object);  
            } else {
              api.replace(graph, t.object, t.subject);
            }
          }
        });
        equivs = graph.filter( api.filters.p(api.resolve('owl:sameAs')) );
    }
  };
  api.replace = function(graph,o,n) {
    api.log("replacing " + o.toNT() + " with " + n.toNT());
    var sfilter = api.filters.describes(o);
    graph.filter( sfilter ).forEach( function(t) {
      if(t.subject.equals(o)) {
        graph.add( api.t(n,t.property,t.object) );
      } else if(t.object.equals(o)) {
        graph.add( api.t(t.subject,t.property,n) );
      }
    });
    graph.apply( function(t) { return !sfilter(t) && !t.subject.equals(t.object); });
    if(o.nodeType() != 'BlankNode') {
      graph.add( api.t(n,api.resolve("link:uri"),o) );
    }
  };
  api.filterCount = function(graph,filter) {
    var ctr = 0;
    graph.forEach(function(t) { if(filter(t)) { ++ctr; } });
    return ctr;
  };
  api.uniqueResources = function(graph) {
    var resources = [];
    graph.forEach( function(t) {
      resources.push(t.subject);
      if(t.object.nodeType() == 'IRI' || t.object.nodeType() == 'BlankNode') resources.push(t.object);
    });
    var out = [];
    while(resources.length>0) {
      var test = resources.pop();
      if(!out.some(function(o){return test.equals(o);})) out.push(test);
    }
    return out;
  };
  api.iri = function(iri) {
    iri = iri.toString();
    if(iri.startsWith('<') && iri.endsWith('>') ) { iri = iri.slice(1,iri.length-1); }
    return api.data.context.createIRI(iri);
  };
  api.resolve = function(curie) { return api.data.context.resolveCurie(curie); };
  api.link = function(s,p,o) {
    s = api.blankNodeOrIRI(s);
    o = api.blankNodeOrIRI(o);
    return api.data.context.createTriple(s,api.iri(p),o);
  }
  api.blankNodeOrIRI = function(o) {
    if(typeof o == "string") {
      if(o.substring(0,2) == "_:") {
        var b = api.data.context.createBlankNode();
        b.value = o;
        o = b;
      } else {
        o = api.iri(o);
      }
    }
    return o;
  }
  api.t = function(s,p,o) { return api.data.context.createTriple(s,p,o); }
  api.select = function(query,graph) { return new api.querylangs.RDFSelector(api.data.context).select(query,graph); };
  api.errorHandler = null;
  api.save = function(iri, data) {
    var async = false;
    var oldiri = iri.toString();
    iri = (new api.IRI(iri.toString())).defrag().toString();
    var xhr = new XMLHttpRequest;
    xhr.onreadystatechange = function(e) {
      var _ = this;
      if(_.readyState == 4) {
        if(_.status == 200) {
          alert('stored at ' + oldiri);
        }
      }
    };
    xhr.open("PUT", iri, async);
    xhr.withCredentials = true;
    xhr.timeout = 40000;
    xhr.setRequestHeader("Content-Type", "text/turtle");
    xhr.send(data);
    return
  };
  api.get = function(iri, cback, async) {
    if(async == null) { async = true }
    var oldiri = iri.toString();
    iri = (new api.IRI(iri.toString())).defrag().toString();
    var xhr = new XMLHttpRequest;
    xhr.onreadystatechange = function(e) {
      var _ = this;
      if(_.readyState == 4) {
        if(_.status == 200) {
          try {
            cback(_);
          } catch (e) {
            if(api.errorHandler != null) {
             api.errorHandler(e);
            } else { throw e; }
          }
        } else if(api.errorHandler != null) { api.errorHandler(new Error("Failed to load resource " + oldiri + " the server responded with a status of " + _.status)) };
      }
    };
    if(api.proxy != null) { iri = api.proxy + iri; }
    xhr.open("GET", iri, async);
    xhr.followRedirects = true;
    xhr.timeout = 40000;
    xhr.setRequestHeader("Accept", "application/rdf+xml;q=0.9, application/x-turtle;q=0.9, application/turtle;q=0.9, text/rdf+n3;q=0.9, text/turtle;q=0.9, text/rdf;q=0.9, application/n3;q=0.8, text/n3;q=0.8, application/xml;q=0.7, text/*;q=0.6, */*;q=0");
    xhr.send();
    return
  };
  api.negotiate = function(xhr,ctx,iri) {
    var parser = null;
    var doc = xhr.responseText;
    var ctype = xhr.getResponseHeader("Content-Type");
    if(ctype != null) {
      var p = ctype.indexOf(";");
      if(p > -1) { ctype = ctype.substring(0, p) }
    }else {
      ctype = ""
    }
    switch(ctype) {
      case "application/rdf+xml": case "application/xml": case "text/xml":
        parser = new api.parsers.RDFXML(ctx);
        doc = xhr.responseXML;
        break;
      case "text/turtle": case "application/x-turtle": case "application/turtle": case "text/rdf+n3": case "text/n3": case "application/n3":
      parser = new api.parsers.Turtle(ctx);
      break;
      case "text/rdf": case "text/text": case "text/plain": case "text/html": case "":
        if(xhr.responseXML) {
          parser = new api.parsers.RDFXML(ctx);
          doc = xhr.responseXML;
        } else {
          if(doc.indexOf("xmlns:rdf=") > -1) {
            parser = new api.parsers.RDFXML(ctx);
            doc = new DOMParser().parseFromString(doc, "text/xml");
          } else {
            parser = new api.parsers.Turtle(ctx);
          }
        }
        break;
    }
    if(parser == null) { throw new Error(iri.toString() + " Unrecognized mediatype: '" + ctype + "'"); }
    return [parser,doc,ctype];
  };
  api.mergeContext = function(ctx) {
    api.data.context.curieMap = ctx.curieMap;
    api.data.context._loadDefaultPrefixMap();
  };
  api.parse = function(what, cb, filter, graph) {
    if(what instanceof Document || ( what.indexOf && what.indexOf(' ') > 0 ) ) return api.parseDoc(what,cb,filter,graph);
    var async = cb != null;
    var ctx = api.data.createContext();
    var iri = api.iri(what.toString());
    ctx.base = iri;
    this.get(iri.toString(), function(xhr) {
      var parts = api.negotiate(xhr,ctx,iri);
      try {
        parts[0].parse(parts[1], cb, filter, graph);
        api.mergeContext(ctx);
      } catch(e) { throw new Error( iri.toString() + " [ " + parts[2] + " ] - " + e.toString() ); }
    }, async);
    return true
  };
  api.parseDoc = function(doc, cb, filter, graph) {
    var p = doc instanceof Document
            ? new api.parsers.RDFXML(api.data.createContext())
            : new api.parsers.Turtle(api.data.createContext());
    return p.parse(doc, cb, filter, graph);
  };
  api.process = function(iri, processor, filter) {
    var async = true;
    iri = api.data.context.createIRI(iri.toString());
    var ctx = api.data.createContext();
    ctx.base = iri;
    this.get(iri.toString(), function(xhr) {
      var parts = api.negotiate(xhr,ctx,iri);
      parts[0].process(parts[1], processor, filter);
      api.mergeContext(ctx);
    }, async);
    return true
  };
  api.nt = function(graph) { return new api.serializers.NTriples(api.data.context).serialize(graph); };
  api.turtle = function(graph) { return new api.serializers.Turtle(api.data.context).serialize(graph); };
})(rdfapi);
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
/**
 * Instantiation
 */
rdfapi.data = new rdfapi.Data;
if(typeof exports != "undefined") {
  module.exports = rdfapi; // we require this.. .. ....
} else if(typeof document == 'object') {
  document.data = rdfapi.data; // note that they're the same..
}
