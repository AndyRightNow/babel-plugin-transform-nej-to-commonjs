!function (name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition();
  else if (typeof NEJ !== 'undefined' && NEJ.define) NEJ.define(['util/encode/md5'],definition);
  else this[name] = definition()
}('objectUtil', function ( _md5) {
  return _md5;
});

