(function() {
  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_r` variable.
  var previous_r = root._r;

  // Create quick reference variables for speed access to core prototypes.
  var slice = Array.prototype.slice, undef;

  // Create a safe reference to the Underscore object for use below.
  var _r = function(obj, transform) {
    if (_r.as(obj)){
      if(transform === undef){
        return obj;
      }
      var wrappedFns = _.clone(obj._wrappedFns);
      wrappedFns.push(transform);
      var copy = new _r(obj._wrapped, wrappedFns);
      copy._resolveSingleValue = obj._resolveSingleValue;
      return copy;
    }

    if (!(_r.as(this))) return new _r(obj, transform);

    if(_r.as(transform)){
      this._resolveSingleValue = transform._resolveSingleValue;
      transform = transform._wrappedFns;
    }

    if(_.isFunction(transform)){
      this._wrappedFns = [transform];
    } else if(_.isArray(transform)){
      this._wrappedFns = _.filter(transform, _.isFunction);
    } else {
      this._wrappedFns = [];
    }

    this._wrapped = _r.wrap.call(this, obj);
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_r` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _r;
    }
    exports._r = _r;
  } else {
    root._r = _r;
  }

  // Current version.
  _r.VERSION = '0.0.9';

  // Reference to Underscore from browser
  var _ = root._,
      t = root.transducers;
  if (typeof _ === 'undefined' && typeof require !== 'undefined'){
    _ = require('underscore');
    t = require('transducers-js');
  }

  // Collection Functions
  // --------------------
  //
  function initDefault(){
    return this.xf.init();
  }

  function stepDefault(res, input){
    return this.xf.step(res, input)
  }

  function resultDefault(res){
    return this.xf.result(res);
  }

  // Executes the iteratee with iteratee(input, idx, result) for each item
  // passed through transducer without changing the result.
  _r.each = _r.forEach = function(iteratee) {
    return function(xf){
      return new Each(iteratee, xf);
    }
  }
  function Each(f, xf) {
    this.xf = xf;
    this.f = f;
    this.i = 0;
  }
  Each.prototype.init = initDefault;
  Each.prototype.result = resultDefault;
  Each.prototype.step = function(res, input) {
    this.f(input, this.i++);
    return this.xf.step(res, input);
  }

  // Return the results of applying the iteratee to each element.
  // Stateless transducer
  _r.map = _r.collect = function(iteratee) {
    return t.map(_r.iteratee(iteratee));
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  // Stateless transducer
  _r.find = _r.detect = function(predicate) {
     predicate = _r.iteratee(predicate);
     _r.resolveSingleValue(this);
     return function(xf){
       return new Find(predicate, xf);
     }
  };
  function Find(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  Find.prototype.init = initDefault;
  Find.prototype.result = resultDefault;
  Find.prototype.step = function(result, input) {
    if(this.f(input)){
      return _r.reduced(this.xf.step(result, input))
    }
    return result;
  }

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  // Stateless transducer
  _r.filter = _r.select = function(predicate) {
    predicate = _r.iteratee(predicate);
    return t.filter(predicate);
  };

  // Return all the elements for which a truth test fails.
  // Stateless transducer
  _r.reject = _r.remove = function(predicate) {
    return t.remove(_r.iteratee(predicate));
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  // Stateful transducer (found).  Early termination if item
  // does not match predicate.
  _r.every = _r.all = function(predicate) {
    predicate = _r.iteratee(predicate);
    _r.resolveSingleValue(this);
    return function(xf){
      return new Every(predicate, xf);
    }
  };
  function Every(f, xf) {
    this.xf = xf;
    this.f = f;
    this.found = false;
  }
  Every.prototype.init = initDefault;
  Every.prototype.result = function(result){
    if(!this.found){
      result = this.xf.step(result, true);
    }
    return this.xf.result(result);
  }
  Every.prototype.step = function(result, input) {
    if(!this.f(input)){
      this.found = true;
      return _r.reduced(this.xf.step(result, false));
    }
    return result;
  }

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  // Stateful transducer (found).  Early termination if item matches predicate.
  _r.some = _r.any = function(predicate) {
    predicate = _r.iteratee(predicate);
    _r.resolveSingleValue(this);
    return function(xf){
      return new Some(predicate, xf);
    }
  };
  function Some(f, xf) {
    this.xf = xf;
    this.f = f;
    this.found = false;
  }
  Some.prototype.init = initDefault;
  Some.prototype.result = function(result){
    if(!this.found){
      result = this.xf.step(result, false);
    }
    return this.xf.result(result);
  }
  Some.prototype.step = function(result, input) {
    if(this.f(input)){
      this.found = true;
      return _r.reduced(this.xf.step(result, true));
    }
    return result;
  }

  // Determine if contains a given value (using `===`).
  // Aliased as `include`.
  // Stateful transducer (found). Early termination when item found.
  _r.contains = _r.include = function(target) {
    return _r.some.call(this, function(x){return x === target});
  };

  // Invoke a method (with arguments) on every item in a collection.
  // Stateless transducer
  _r.invoke = function(method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _r.map(function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  // Stateless transducer.
  _r.pluck = function(key) {
    return _r.map(_.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  // Stateless transducer
  _r.where = function(attrs) {
    return _r.filter(_.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  // Stateful transducer (found). Early termination when found.
  _r.findWhere = function(attrs) {
    return _r.find.call(this, _.matches(attrs));
  };

  // Return the maximum element (or element-based computation).
  // Stateful transducer (current max value and computed result)
  _r.max = function(iteratee) {
    iteratee = _r.iteratee(iteratee);
    _r.resolveSingleValue(this);
    return function(xf){
      return new Max(iteratee, xf);
    }
  };
  function Max(f, xf) {
    this.xf = xf;
    this.f = f;
    this.computedResult = -Infinity;
    this.lastComputed = -Infinity
  }
  Max.prototype.init = initDefault;
  Max.prototype.result = function(result){
    result = this.xf.step(result, this.computedResult);
    return this.xf.result(result);
  }
  Max.prototype.step = function(result, input) {
    var computed = this.f(input);
    if (computed > this.lastComputed
        || computed === -Infinity && this.computedResult === -Infinity) {
      this.computedResult = input;
      this.lastComputed = computed;
    }
    return result;
  }

  // Return the minimum element (or element-based computation).
  // Stateful transducer (current min value and computed result)
  _r.min = function(iteratee) {
    iteratee = _r.iteratee(iteratee);
    _r.resolveSingleValue(this);
    return function(xf){
      return new Min(iteratee, xf);
    }
  };
  function Min(f, xf) {
    this.xf = xf;
    this.f = f;
    this.computedResult = Infinity;
    this.lastComputed = Infinity
  }
  Min.prototype.init = initDefault;
  Min.prototype.result = function(result){
    result = this.xf.step(result, this.computedResult);
    return this.xf.result(result);
  }
  Min.prototype.step = function(result, input) {
    var computed = this.f(input);
    if (computed < this.lastComputed
        || computed === Infinity && this.computedResult === Infinity) {
      this.computedResult = input;
      this.lastComputed = computed;
    }
    return result;
  }


  // Array Functions
  // ---------------

  // Adds one or more items to the end of the sequence, like Array.prototype.push.
  _r.push = function(){
    var toPush = _.toArray(arguments);
    return function(xf){
      return new Push(toPush, xf);
    }
  }
  function Push(toPush, xf) {
    this.xf = xf;
    this.toPush = toPush;
  }
  Push.prototype.init = initDefault;
  Push.prototype.result = function(result){
    var idx, toPush = this.toPush, len = toPush.length;
    for(idx = 0; idx < len; idx++){
      result = this.xf.step(result, toPush[idx]);
    }
    return this.xf.result(result);
  }
  Push.prototype.step = stepDefault;


  // Adds one or more items to the beginning of the sequence, like Array.prototype.unshift.
  _r.unshift = function(){
    var toUnshift = _.toArray(arguments);
    return function(xf){
      return new Unshift(toUnshift, xf);
    }
  }
  function Unshift(toUnshift, xf) {
    this.xf = xf;
    this.toUnshift = toUnshift;
  }
  Unshift.prototype.init = initDefault;
  Unshift.prototype.result = resultDefault;
  Unshift.prototype.step = function(result, input){
    var toUnshift = this.toUnshift;
    if(toUnshift){
      var idx, len = toUnshift.length;
      for(idx = 0; idx < len; idx++){
        result = this.xf.step(result, toUnshift[idx]);
      }
    }
    this.toUnshift = null;
    return this.xf.step(result, input);
  }

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`.
  // Stateful transducer (running count)
  _r.first = _r.head = _r.take = function(n) {
     if(n === undef){
       _r.resolveSingleValue(this);
       n = 1;
     } else {
       n = (n > 0) ? n : 0;
     }
     return t.take(n);
  };

  // Returns everything but the last entry. Passing **n** will return all the values
  // excluding the last N.
  // Stateful transducer (count and buffer).
  // Note that no items will be sent and all items will be buffered until completion.
  _r.initial = function(n) {
    n = (n === undef) ? 1 : (n > 0) ? n : 0;
    return function(xf){
      return new Initial(n, xf);
    }
  };
  function Initial(n, xf) {
    this.xf = xf;
    this.n = n;
    this.idx = 0;
    this.buffer = [];
  }
  Initial.prototype.init = initDefault;
  Initial.prototype.result = function(result){
    var idx = 0, count = this.idx - this.n, buffer = this.buffer;
    for(idx = 0; idx < count; idx++){
      result = this.xf.step(result, buffer[idx]);
    }
    return result;
  }
  Initial.prototype.step = function(result, input){
    this.buffer[this.idx++] = input;
    return result;
  }

  // Get the last element. Passing **n** will return the last N  values.
  // Stateful transducer (count and buffer).
  // Note that no items will be sent until completion.
  _r.last = function(n) {
    if(n === undef){
      _r.resolveSingleValue(this);
      n = 1;
    } else {
      n = (n > 0) ? n : 0;
    }
    return function(xf){
      return new Last(n, xf);
    }
  };
  function Last(n, xf) {
    this.xf = xf;
    this.n = n;
    this.idx = 0;
    this.buffer = [];
  }
  Last.prototype.init = initDefault;
  Last.prototype.result = function(result){
    var n = this.n, count = n, buffer=this.buffer, idx=this.idx;
    if(idx < count){
      count = idx;
      idx = 0;
    }
    while(count--){
      result = this.xf.step(result, buffer[idx++ % n]);
    }
    return this.xf.result(result);
  }
  Last.prototype.step = function(result, input){
    this.buffer[this.idx++ % this.n] = input;
    return result;
  }

  // Returns everything but the first entry. Aliased as `tail` and `drop`.
  // Passing an **n** will return the rest N values.
  // Stateful transducer (count of items)
  _r.rest = _r.tail = _r.drop = function(n) {
    n = (n === undef) ? 1 : (n > 0) ? n : 0;
    return t.drop(n);
  };

  // Trim out all falsy values from an array.
  // Stateless transducer
  _r.compact = function() {
    return _r.filter(_.identity);
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  // Steteful transducer (index and all seen items if not sorted, last seen item if sorted).
  _r.uniq = _r.unique = function(isSorted, iteratee) {
     if (!_.isBoolean(isSorted)) {
       iteratee = isSorted;
       isSorted = false;
     }
     if (iteratee != null) iteratee = _r.iteratee(iteratee);
     return function(xf){
       return new Uniq(iteratee, isSorted, xf);
     }
  };
  function Uniq(f, isSorted, xf) {
    this.xf = xf;
    this.f = f;
    this.isSorted = isSorted;
    this.seen = [];
    this.i = 0;
  }
  Uniq.prototype.init = initDefault;
  Uniq.prototype.result = resultDefault;
  Uniq.prototype.step = function(result, input){
    var seen = this.seen;
    if (this.isSorted) {
      if (!this.i || seen !== input){
        result = this.xf.step(result, input);
      }
      this.seen = input;
      this.i++;
    } else if (this.f) {
      var computed = this.f(input);
      if (_.indexOf(seen, computed) < 0) {
        seen.push(computed);
        result = this.xf.step(result, input);
      }
    } else if (_.indexOf(seen, input) < 0) {
        seen.push(input);
        result = this.xf.step(result, input);
    }
    return result;
  }

  // Invokes interceptor with each result and input, and then passes through input.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  // Executes interceptor with current result and input
  // Stateless transducer
  _r.tap = function(interceptor) {
   return function(xf){
     return new Tap(interceptor, xf);
   }
  };
  function Tap(f, xf) {
    this.xf = xf;
    this.f = f;
    this.i = 0;
  }
  Tap.prototype.init = initDefault;
  Tap.prototype.result = resultDefault;
  Tap.prototype.step = function(result, input) {
    this.f(result, input, this.i++);
    return this.xf.step(result, input);
  }

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Add your own custom transducers to the Underscore.transducer object.
  _r.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _r[name] = obj[name];
      _r.prototype[name] = function() {
        var method = func.apply(this, arguments);
        return _r(this, method);
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _r.mixin(_r);

  // Returns the value if it is a chained transformation, else null
  _r.as = function(value){
    return value instanceof _r ? value : null;
  }

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _r.noConflict = function() {
    root._r = previous_r;
    return this;
  };

  // Returns a new chained instance using current transformation, but
  // wrapping the given source
  _r.prototype.withSource = function(obj){
    return _r(obj, this);
  }

  // Composes and returns the underlying wrapped functions
  _r.prototype.transducer = _r.prototype.compose = function() {
    var fns = this._wrappedFns;
    return fns.length ? _.compose.apply(null, fns) : undef;
  }

  // Helper to mark transducer to expect single value when
  // resolving. Only valid when chaining, but this should be passed
  // when called as a function
  _r.resolveSingleValue = function(self){
    resolveSingleValue(self, true);
  }

  // Helper to mark transducer to expect multiple values when
  // resolving. Only valid when chaining, but this should be passed
  // when called as a function.
  _r.resolveMultipleValues = function(self){
    resolveSingleValue(self, false);
  }

  function resolveSingleValue(self, single){
    if(_r.as(self)){
      self._resolveSingleValue = single;
    }
  }

  // sentinel to ignore wrapped objects (maintain only last item)
  var IGNORE = {};

  // Resolves the value of the wrapped object, similar to underscore.
  // Returns an array, or single value (to match underscore API)
  // depending on whether the chained transformation resolves to single value.
  _r.prototype.value = function(){
    if(!this._resolveSingleValue){
      return this.into();
    }

    var ret =  this.into(IGNORE);
    return ret === IGNORE ? undef : ret;
  }

  // Dispatchers
  // -----------
  var dispatch = _.reduce(
    ['iterator', 'iteratee', 'empty', 'append', 'wrap', 'unwrap'],
    function(memo, item){

    var d = function(){
      var args = arguments, fns = d._fns, i = fns.length, result,
          self = _r.as(this);
      for(; i-- ;){
        result = fns[i].apply(self, args);
        if(result !== undef){
          return result;
        }
      }
      throw new TypeError('cannot find match for '+item+' '+_.toArray(args));
    };

    d._fns = [];

    d.register = function(fn){
      d._fns.push(fn);
    };

    memo[item] = d;
    return memo;
  }, {});

  // Wraps a value used as source for use during chained transformation. 
  //
  // Default returns value, or _r.empty() if undefined.
  //
  // Dispatch function. To support different types,
  // call _r.unwrap.register
  _r.wrap = function(value){
    return dispatch.wrap.call(this, value);
  }

  _r.wrap.register = function(fn){
    return dispatch.wrap.register(fn);
  }

  _r.wrap.register(function(value){
    if(value == null){
      value = _r.empty();
    }
    return value;
  });

  // Unwraps (deref) a possibly wrapped value
  // Default unwraps values created with _r.reduced,
  // or calls value() on chained _r transformations,
  // otherwise returns parameter.
  //
  // Dispatch function. To support different types,
  // call _r.unwrap.register
  _r.unwrap = _r.deref = function(value){
    return dispatch.unwrap(value);
  }

  _r.unwrap.register = function(fn){
    return dispatch.unwrap.register(fn);
  }

  _r.unwrap.register(function(value){
    if(_r.isReduced(value)){
      return value.value;
    } else if(_r.as(value)){
      return r.value();
    }
    return value;
  });

  // Returns an iterator that has next function
  // and returns {value, done}. Default looks for
  // object with iterator Symbol (or '@@iterator').
  // This is available with _r.iterator.Symbol
  //
  // Dispatch function. To support different types
  // call _r.iterator.register and supply function that returns
  // an iterator after checking the input using appropriate
  // predicates. Return undefined if not supported, so other
  // dispatched functions can be checked
  _r.iterator = function(obj){
    return dispatch.iterator(obj);
  }

  _r.iterator.register = function(fn){
    return dispatch.iterator.register(fn);
  }

  var Symbol_iterator = (typeof Symbol !== 'undefined' && Symbol.iterator || '@@iterator');
  _r.iterator.Symbol = Symbol_iterator;

  _r.iterator.register(function(obj){
    if (_.isObject(obj)){
      var iterator = ((obj[Symbol_iterator] && obj[Symbol_iterator]() || obj));
      if(_.isFunction(iterator.next)){
        return iterator;
      }
    }
    return null;
  });

  // Mostly internal function that generates a callback from the given value.
  // For use with generating callbacks for map, filter, find, etc.
  //
  // Default returns _.iteratee.
  //
  // Dispatch function. To support different types
  // call _r.iteratee.register and supply function that returns
  // a callback after checking the input using appropriate
  // predicates. Return undefined if not supported, so other
  // dispatched functions can be checked
  _r.iteratee = function(value){
    return dispatch.iteratee(value);
  }

  _r.iteratee.register = function(fn){
    return dispatch.iteratee.register(fn);
  }

  _r.iteratee.register(function(value){
    if(_r.as(value)){
      return _riteratee(value);
    }
    return _.iteratee(value);
  });

  function _riteratee(value){
    return function(item){
      return value.withSource(item).value();
    }
  }

  // Returns empty object of the same type as argument.
  // Default returns [] if _.isArray or undefined, {} if _.isObject
  // and an internal sentinel to ignore otherwise
  //
  // Dispatch function. To support different types
  // call _r.empty.register and supply function that returns
  // an empty object after checking the input using appropriate
  // predicates. Return undefined if not supported, so other
  // dispatched functions can be checked
  _r.empty = function(obj){
    return obj === IGNORE ? IGNORE : dispatch.empty(obj);
  }

  _r.empty.register = function(fn){
    return dispatch.empty.register(fn);
  }

  _r.empty.register(function(obj){
    if(obj === undef || _.isArray(obj) || _r.iterator(obj)){
      return []; // array if not specified or from array
    } else if(_.isObject(obj)){
      return {}; // object if from object
    }

    // ignore by default. Default append just maintains last item.
    return IGNORE;
  });

  // Appends (conjoins) the item to the collection, and returns collection
  //
  // Dispatch function. To support different types
  // call _r.append.register and supply function that append to the object
  // (first param) with the item and optional key after checking the input
  // using appropriate predicates.
  //
  // Return undefined if not supported, so other dispatched functions can be checked
  _r.append = _r.conj = _r.conjoin = function(obj, item, key){
    if(obj === undef){
      // create arrays by default
      return [];
    }

    if(item === undef){
      // completion function, unwrap object
      return _r.unwrap(obj);
    } 
    
    if (item === IGNORE){
      // ignore item
      return obj;
    }

    if(obj === IGNORE){
      // Maintain last item if requested to ignore object
      return item;
    }

    // valid object and item, dispatch
    return dispatch.append(obj, item, key);
  }

  _r.append.register = function(fn){
    return dispatch.append.register(fn);
  }

  _r.append.register(function(obj, item, key){
    if(_.isArray(obj)){
      obj.push(item);
      return obj;
    } else if(key !== undef && _.isObject(obj)){
      obj[key] = item;
      return obj;
    }

    // just maintain last item
    return item;
  });

  // Reducer that dispatches to empty, unwrap and append
  function Dispatch(){}
  Dispatch.prototype.init = _r.empty;
  Dispatch.prototype.result = _r.unwrap;
  Dispatch.prototype.step = _r.append;

   // Reducer that maintains last value
   function LastValue(){}
   LastValue.prototype.init = _.identity;
   LastValue.prototype.result = _.identity;
   LastValue.prototype.step = function(result, input){
     return input;
   }

  // Transducer Functions
  // --------------------

  // Wrapper to return from iteratee of reduce to terminate
  // _r.reduce early with the provided value
  _r.reduced = function(value){
    return t.ensureReduced(value);
  }
  _r.isReduced = function(value){
    return t.isReduced(value);
  }

  _r.reduce = _r.foldl = _r.inject = function(xf, init, coll) {
    if (coll == null) coll = _r.empty(coll);
    return t.reduce(xf, init, coll);
  };

  _r.transduce = function(xf, f, init, coll){
    if(_r.as(xf)){
      xf = xf.compose();
    }

    return _r.unwrap(t.transduce(xf, f, init, coll));
  }

  // Calls transduce using the chained transformation
  _r.prototype.transduce = function(f, init, coll){
    if(coll === undef){
      coll = this._wrapped;
    }
    return _r.transduce(this, f, init, coll);
  }

  // Creates a callback that starts a transducer process and accepts
  // parameter as a new item in the process. Each item advances the state
  // of the transducer. If the transducer exhausts due to early termination,
  // all subsequent calls to the callback will no-op and return the computed result.
  //
  // If the callback is called with no argument, the transducer terminates,
  // and all subsequent calls will no-op and return the computed result.
  //
  // The callback returns undefined until completion. Once completed, the result
  // is always returned.
  //
  // If init is defined, maintains last value and does not buffer results.
  // If init is provided, it is dispatched
  _r.asCallback = function(xf, init){
    var done = false, stepper, result;

    if(_r.as(xf)){
      xf = xf.compose();
    }

    if(init === undef){
      stepper = xf(new LastValue());
    } else {
      stepper = xf(new Dispatch());
    }

    result = stepper.init();

    return function(item){
      if(done) return result;

      if(item === undef){
        // complete
        result = stepper.result(result);
        done = true;
      } else {
        // step to next result.
        result = stepper.step(result, item);

        // check if exhausted
        if(_r.isReduced(result)){
          result = stepper.result(_r.unwrap(result));
          done = true;
        }
      }

      if(done) return result;
    }
  }

  // Calls asCallback with the chained transformation
  _r.prototype.asCallback = function(init){
    return _r.asCallback(this,  init);
  }

  // Creates an async callback that starts a transducer process and accepts
  // parameter cb(err, item) as a new item in the process. The returned callback
  // and the optional continuation follow node conventions with  fn(err, item).
  //
  // Each item advances the state  of the transducer, if the continuation
  // is provided, it will be called on completion or error. An error will terminate
  // the transducer and be propagated to the continuation.  If the transducer
  // exhausts due to early termination, any further call will be a no-op.
  //
  // If the callback is called with no item, it will terminate the transducer process.
  //
  // If init is defined, maintains last value and does not buffer results.
  // If init is provided, it is dispatched
  _r.asyncCallback = function(xf, continuation, init){
    var done = false, stepper, result;

    if(_r.as(xf)){
      xf = xf.compose();
    }

    if(init === undef){
      stepper = xf(new LastValue());
    } else {
      stepper = xf(new Dispatch());
    }

    result = stepper.init();

    function checkDone(err, item){
      if(done){
        return true;
      }

      err = err || null;

      // check if exhausted
      if(_r.isReduced(result)){
        result = _r.unwrap(result);
        done = true;
      }

      if(err || done || item === undef){
        result = stepper.result(result);
        done = true;
      }

      // notify if done
      if(done){
        if(continuation){
          continuation(err, result);
          continuation = null;
        } else if(err){
          throw err;
        }
        result = null;
      }

      return done;
    }

    return function(err, item){
      if(!checkDone(err, item)){
        try {
          // step to next result.
          result = stepper.step(result, item);
          checkDone(err, item);
        } catch(err2){
          checkDone(err2, item);
        }
      }
    }
  }

  // Calls asyncCallback with the chained transformation
  _r.prototype.asyncCallback = function(continuation, init){
    return _r.asyncCallback(this, continuation, init);
  }

  // Returns a new coll consisting of to-coll with all of the items of
  // from-coll conjoined. A transducer (step function) may be supplied.
  _r.into = function(to, xf, from){
    var f = _r.append;

    if(from === undef){
      from = xf;
      xf = undef;
    }

    if(from === undef){
      from = _r.empty();
    }

    if(_r.as(xf)){
      xf = xf.compose();
    }

    if(xf === undef){
      return _r.reduce(f, to, from);
    }

    return _r.transduce(xf, f, to, from);
  }

  // Calls into using the chained transformation
  _r.prototype.into = function(to, from){
    if(from === undef){
      from = this._wrapped;
    }

    if(from === undef){
      from = _r.empty();
    }

    if(to === undef){
      to = _r.empty(from);
    }

    return _r.into(to, this, from);
  }

  // Returns a new collection of the empty value of the from collection
  _r.sequence = function(xf, from){
    return _r.into(_r.empty(from), xf, from);
  }

  // calls sequence with chained transformation and optional wrapped object
  _r.prototype.sequence = function(from){
    return this.into(_r.empty(from), from);
  }

  // Creates an (duck typed) iterator that calls the provided next callback repeatedly
  // and uses the return value as the next value of the iterator.
  // Marks iterator as done if the next callback returns undefined (returns nothing)
  // Can be used to as a source obj to reduce, transduce etc
  _r.generate = function(callback, callToInit){
    var gen = {};
    gen[Symbol_iterator] = function(){
      var next = callToInit ? callback() : callback;
      return {
        next: function(){
          var value = next();
          return (value === undef) ? {done: true} : {done: false, value: value};
        }
      }
    }
    return gen;
  }

  // Transduces the current chained object by using the chained trasnformation
  // and an iterator created with the callback
  _r.prototype.generate = function(callback, callToInit){
    return this.withSource(_r.generate(callback, callToInit));
  }

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore.transducer', [], function() {
      return _r;
    });
  }
}.call(this));