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
