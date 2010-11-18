/**
 * rdfa-api extensions
 */
(function(api) {
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
})(rdfapi);
