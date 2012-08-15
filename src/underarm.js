;(function(root){
"use strict";

var _r = {}
if(typeof exports === 'undefined'){
  var _rOld = root._r
  _r.noConflict = function(){
    root._r = _rOld
    return _r
  }
  root._r = _r
} else {
  _r = exports
}

var ObjectProto = Object.prototype
  , ArrayProto = Array.prototype
  , toString = ObjectProto.toString
  , hasOwnProp = ObjectProto.hasOwnProperty
  , isArray = Array.isArray || function(obj) {
      return toString.call(obj) == '[object Array]'
  }
  , isUndefined = function(obj) {
      return obj === void 0
  }
  , isObject = function(obj) {
      return obj === Object(obj)
  }
  , isFunction = function(obj){
      return toString.call(obj) == '[object Function]'
  }
  , has = function(obj, key) {
    return hasOwnProp.call(obj, key)
  }
  , indexOf = ArrayProto.indexOf || function(obj){
    var i = 0
      , len = this.length
    for(; i < len; i++){
      if(this[i] === obj){
        return i
      }
    }
    return -1
  }
  , removeFrom = function(array, value){
      var idx = indexOf.call(array, value)
      if(idx >= 0){
        array.splice(idx, 1)
      }
  }


var Producer = (function(){
  function Producer(){
    this.subscribers = []
  }
  var P = Producer.prototype

  P.onSubscribe = null

  P.subscribe = subscribe
  function subscribe(next, complete, error){
    var subscriber = new Subscriber(next, complete, error)
      , producer = this

    if(producer.onSubscribe){
      var disposable = producer.onSubscribe(subscriber)
      if(!isUndefined(disposable)){
        if(isFunction(disposable)){
          subscriber.onDispose(disposable)
        } else if(isFunction(disposable.dispose)){
          subscriber.onDispose(function(){
            disposable.dispose()
          })
        }
      }
    }

    subscriber.onDispose(function(){
      producer.unsubscribe(subscriber)
    })

    producer.subscribers.push(subscriber)
    return subscriber
  }

  P.unsubscribe = unsubscribe
  function unsubscribe(subscriber){
    removeFrom(this.subscribers, subscriber)
  }

  return Producer
})()

var Subscriber = (function(){
  function Subscriber(next, complete, error){
    appendToMethod(this, 'next', next)
    appendToMethod(this, 'complete', complete)
    appendToMethod(this, 'error', error)
  }
  var P = Subscriber.prototype

  P.next = next
  function next(value){
  }

  P.error = error
  function error(err){
    this.dispose()
  }

  P.complete = complete
  function complete(){
    this.dispose()
  }

  P.dispose = dispose
  function dispose(){
  }

  P.onDispose = onDispose
  function onDispose(onDispose){
    appendToMethod(this, 'dispose', onDispose)
  }

  function appendToMethod(obj, method, toAppend){
    if(isFunction(toAppend)){
      var func = obj[method]
      obj[method] = function(arg){
        toAppend.call(obj, arg)
        func.call(obj, arg)
      }
    }
  }

  return Subscriber
})()


var Subject = (function(){
  function Subject(){
    this.producer = new Producer()
  }
  var P = Subject.prototype

  P.subscribe = subscribe
  function subscribe(next, complete, error){
    return this.producer.subscribe(next, complete, error)
  }

  P.next = next
  function next(value){
    eachSubscriber(this, 'next', value)
  }

  P.error = error
  function error(error){
    eachSubscriber(this, 'error', error)
  }

  P.complete = complete
  function complete(){
    eachSubscriber(this, 'complete')
  }

  P.dispose = dispose
  function dispose(){
    eachSubscriber(this, 'dispose')
  }

  function eachSubscriber(target, action, val){
    var i = 0
      , subscribers = target.producer.subscribers
    for(; i < subscribers.length; i++){
      subscribers[i][action](val)
    }
  }

  return Subject
})()
_r.subject = function(){return new Subject()}

function producerWrap(delegate){
  var producer
  if(delegate instanceof Producer || delegate instanceof Subject){
    producer = delegate
  } else {
    producer = new Producer()
    producer.onSubscribe = function(subscriber){
      subscriber.next(delegate)
      subscriber.complete()
    }
  }
  return producer
}

function produce(delegate, context, next, complete, error){
  var producer = new Producer()
    , delegate = producerWrap(delegate)

  producer.onSubscribe = function(subscriber){
    var wrap = function(wrapped){
        return function(value){
          wrapped.call(context, subscriber, value)
        }
      }
    , defaults = produce.defaults
    , nextW = wrap(isFunction(next) ? next : defaults.next)
    , completeW = wrap(isFunction(complete) ? complete : defaults.complete)
    , errorW = wrap(isFunction(error) ? error : defaults.error)

    return delegate.subscribe(nextW, completeW, errorW)
  }

  return producer
}
produce.defaults = {
    next: function(producer, value){producer.next(value)}
  , complete: function(producer){producer.complete()}
  , error: function(producer, err){producer.error(err)}
}

function produceWithIterator(subject, context, iterator, iterate, complete, error){
  var next = function(producer, value){
    var callback = function(result, finished){
        try {
          iterate(producer, value, result)

          if(finished){
            producer.complete()
          }
        } catch (e){
          producer.error(e)
        }
      }
    , errback = function(err){
      producer.error(err)
    }
    , result

    try {
      result = iterator.call(context, value, callback, errback)
    } catch (e2){
      producer.error(e2)
    }
  }
  return produce(subject, context, next, complete, error)
}

function iteratorIdentity(value, callback){
  callback(value)
}

_r.each = each
function each(subject, iterator, context){
  return produceWithIterator(
      subject
    , context
    , iterator
    , function(producer, value){
        producer.next(value)
      })
}

_r.map = map
function map(subject, iterator, context){
  return produceWithIterator(
      subject
    , context
    , iterator
    , function(producer, value, result){
        producer.next(result)
      })
}

_r.find = find
function find(subject, iterator, context){
  return produceWithIterator(
      subject
    , context
    , iterator
    , function(producer, value, found){
        if(found){
          producer.next(value)
          producer.complete()
        }
      })
}

_r.filter = filter
function filter(subject, iterator, context){
  return produceWithIterator(
      subject
    , context
    , iterator
    , function(producer, value, keep){
        if(keep) producer.next(value)
      })
}

_r.reject = reject
function reject(subject, iterator, context){
  return produceWithIterator(
      subject
    , context
    , iterator
    , function(producer, value, ignore){
        if(!ignore) producer.next(value)
      })
}

_r.every = every
function every(subject, iterator, context){
  return produceWithIterator(
      subject
    , context
    , iterator
    , function(producer, value, passes){
        if(!passes){
          producer.next(false)
          producer.complete()
        }
      }
    , function(producer){
        producer.next(true)
        producer.complete()
    })
}

_r.any = any
function any(subject, iterator, context){
  return produceWithIterator(
      subject
    , context
    , iterator
    , function(producer, value, passes){
        if(passes){
          producer.next(true)
          producer.complete()
        }
      }
    , function(producer){
        producer.next(false)
        producer.complete()
    })
}

_r.contains = contains
function contains(subject, obj, context){
  return any(subject, function(value, cb){cb(value === obj)}, context)
}

_r.seq = seq
function seq(subject, context){
  return produceWithIterator(
      subject
    , context
    , iteratorIdentity
    , function(producer, value){
        if(isArray(value)){
          var i = 0
            , len = value.length
          for(; i < len; i++){
            producer.next(value[i])
          }
        } else if(isObject(value)){
          var key
          for(key in value){
            if(has(value, key)){
              producer.next([key, value[key]])
            }
          }
        } else {
          producer.next(value)
        }
    })
}

})(this)
