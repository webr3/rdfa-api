# RDFa API Prototype #

See http://webr3.org/apps/play/api/lib for full details.

## Contents ##

- RDFa API - Implementation of the RDF Interfaces
- RDFa API - Implementation of the Data Interfaces
- Parsers & Processors
  - NTriples
  - Turtle
  - RDF/XML
- Serializers
  - NTriples
  - Turtle (pretty-print)
- Query Languages
  - RDF Selectors
- Light-weight wrapper API
- Filter library
- ECMAScript V5 compatibility, fast Hash class

## Extra Features ##

- Full CURIE, IRI, URI support with resolution, RFC compliant.
- Preloaded CURIE map with over 100 common prefixes.
- Optimized lightweight (indexed) Graph implementation.
- XHR & CORS Support with full content negotiation and auto-selection (and proxy support).
- Aligned with ECMAScript V5 to give forEach, filter, map/reduce for Graphs
- Quantification (universal/existential), smushing, singlification and reference replacement

## Coming Soon ##
- RDFa 1 and 1.1 Parser/Processor
- RDFa API Document Extentions
- JSON-LD, RDF+JSON and JSN3 Parsers/Processors/Serializers
- Full node.js compatibility (currently RDF/XML parser doesn't work in node)
- WebSockets Triple Streams (Server & Client)
- Triple and Graph Stores
- Automatic type conversion of js native types & CURIEs
- Ontology awareness, inference, smushing (partially supported already) and reasoning
- Optional data validation and type conversion based on range/domain and owl:Restriction
- ACL and WebID Protocol extensions
- Live SPARQL (follows it's nose over the web of data) and in-memory variant
- RDF Diff & Merge (n3 style)
- Full N3 and Amord in RDF Support
- Native K/V Objects per Subject
- Propert Hooks

(list is in no particular order, half of the items are already wip or prototyped)
