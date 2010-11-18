/**
 * rdfapi.Converter
 * Native ecmascript types to Typed and Plain Literals 
 */
(function(api) {
  api.Converter = function() { this.c = api.data.context };
  api.Converter.INTEGER = new RegExp("^(-|\\+)?[0-9]+$", "");
  api.Converter.DOUBLE = new RegExp("^(-|\\+)?(([0-9]+\\.[0-9]*[eE]{1}(-|\\+)?[0-9]+)|(\\.[0-9]+[eE]{1}(-|\\+)?[0-9]+)|([0-9]+[eE]{1}(-|\\+)?[0-9]+))$", "");
  api.Converter.DECIMAL = new RegExp("^(-|\\+)?[0-9]*\\.[0-9]+?$", "");
  api.Converter.prototype = {
    c: null,
    _string: function(s,a) {
      if(!(Boolean(a).valueOf()) || a.indexOf(':') < 0) return this.c.createPlainLiteral(s,a);
      return this.c.createTypedLiteral(s,a);
    },
    _boolean: function(b) {
      return this.c.createTypedLiteral(b?"true":"false",'xsd:boolean')
    },
    _date: function(d,ms) {
      function pad(n){ return n<10 ? '0'+n : n }
      var s = d.getUTCFullYear()+'-' + pad(d.getUTCMonth()+1)+'-' + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':' + pad(d.getUTCMinutes())+':' + pad(d.getUTCSeconds());
      if(Boolean(ms)) s += d.getUTCMilliseconds() > 0 ? s+'.'+d.getUTCMilliseconds() : s;
      return this.c.createTypedLiteral(s += 'Z','xsd:dateTime');
    },
    _number: function(n) {
      if(n == Number.POSITIVE_INFINITY) return this.c.createTypedLiteral('INF','xsd:double');
      if(n == Number.NEGATIVE_INFINITY) return this.c.createTypedLiteral('-INF','xsd:double');
      if(n == Number.NaN) return this.c.createTypedLiteral('NaN','xsd:double');
      n = n.toString();
      if(api.Converter.INTEGER.test(n)) return this.c.createTypedLiteral(n,'xsd:integer');
      if(api.Converter.DECIMAL.test(n)) return this.c.createTypedLiteral(n,'xsd:decimal');
      if(api.Converter.DOUBLE.test(n)) return this.c.createTypedLiteral(n,'xsd:double');
      throw new TypeError("Can't convert weird number: " + n );
    },
    convert: function(l,r) {
      switch(typeof l) {
        case 'string': return this._string(l,r);
        case 'boolean': return this._boolean(l);
        case 'number': return this._number(l);
        case 'object':
          switch(l.constructor.name) {
            case 'Boolean': return this._boolean(l.valueOf());
            case 'Date': return this._date(l);
            case 'Number': return this._number(l);
          }        
      }
      throw new TypeError('Cannot convert type: ' + l.constructor.name);
    }
  };
  api.converter = new api.Converter;
  api.resolve = function(curie) { return api.data.context.resolveCurie(curie); };
  api.iri = function(iri) {
    iri = iri.toString();
    if(iri.startsWith('<') && iri.endsWith('>') ) { iri = iri.slice(1,iri.length-1); }
    return api.data.context.createIRI(iri);
  };
  api.reference = function(i) {
    if(typeof i == "string" && i.indexOf("//") >= 0) return api.iri(i); 
    return api.iri(api.resolve(i))
  };
  api.blankNode = function(ref) {
    var b = api.data.context.createBlankNode();
    if(ref) {
      if(ref.substring(0,2) == "_:") {
        b.value = o;
      } else {
        b.value = '_:'+o;
      }
    }
    return b;
  };
  api.blankNodeOrIRI = function(o) {
    if(typeof o == "string") {
      if(o.substring(0,2) == "_:") {
        o = api.blankNode(o);
      } else {
        o = api.reference(o);
      }
    }
    return o;
  };
  api.literal = function(o,t) {
    return api.converter.convert(o,t);
  };
  api.node = function(o,t) {
    if(!t && typeof o == "string" && o.indexOf(":") >= 0) o = api.blankNodeOrIRI(o);
    if(!o.nodeType) o = api.literal(o,t);
    return o;
  }
  api.link = function(s,p,o) {
    s = api.blankNodeOrIRI(s);
    o = api.blankNodeOrIRI(o);
    return api.data.context.createTriple(s,api.iri(p),o);
  };
  api.t = api.triple = function(s,p,o,t) {
    s = api.blankNodeOrIRI(s);
    p = api.resolve(p);
    o = api.node(o,t);
    return api.data.context.createTriple(s,p,o);
  };
})(rdfapi);
