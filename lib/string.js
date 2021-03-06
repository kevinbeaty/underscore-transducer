'use strict'
var string = require('transduce/string')

module.exports = function(_r){
  // String Functions
  // --------------------
  _r.mixin({
    split: string.split,
    join: join,
    nonEmpty: string.nonEmpty,
    lines: string.lines,
    chars: string.chars,
    words: string.words
  })

  function join(separator){
    /*jshint validthis:true */
    _r.resolveSingleValue(this)
    return string.join(separator)
  }
}
