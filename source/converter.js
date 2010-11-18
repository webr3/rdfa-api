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
    string: function(s,a) {
      if(!(Boolean(a).valueOf()) || a.indexOf(':') < 0) return this.c.createPlainLiteral(s,a);
      return this.c.createTypedLiteral(s,a);
    },
    boolean: function(b) {
      return this.c.createTypedLiteral(b?"true":"false",'xsd:boolean')
    },
    date: function(d,ms) {
      function pad(n){ return n<10 ? '0'+n : n }
      var s = d.getUTCFullYear()+'-' + pad(d.getUTCMonth()+1)+'-' + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':' + pad(d.getUTCMinutes())+':' + pad(d.getUTCSeconds());
      if(Boolean(ms)) s += d.getUTCMilliseconds() > 0 ? s+'.'+d.getUTCMilliseconds() : s;
      return this.c.createTypedLiteral(s += 'Z','xsd:dateTime');
    },
    number: function(n) {
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
        case 'string': return this.string(l,r);
        case 'boolean': return this.boolean(l);
        case 'number': return this.number(l);
        case 'object':
          switch(l.constructor.name) {
            case 'Boolean': return this.boolean(l.valueOf());
            case 'Date': return this.date(l);
            case 'Number': return this.number(l);
          }        
      }
      throw new TypeError('Cannot convert type: ' + l.constructor.name);
    }
  };
  api.converter = new api.Converter;
})(rdfapi);
