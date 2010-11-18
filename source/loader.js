/**
 * Instantiation
 */
if(typeof exports != "undefined") {
  module.exports = rdfapi; // we require this.. .. ....
} else if(typeof document == 'object') {
  document.data = rdfapi.data; // note that they're the same..
}
