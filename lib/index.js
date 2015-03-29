var through    = require("through2");
var request    = require("request");
var extend     = require("xtend/mutable");

/**
 */

var HTTPDatabase = function(options) {
  if (!options) options = {};
  this.options = options;
  this.request = options.request || request;
  this.methods = options.methods || {
      "insert" : "post",
      "update" : "put",
      "load"   : "get",
      "remove" : "del"
  };
}

/**
 */

var _getters = {};

/**
 */

function _get(target, keypath) {
  var getter = _getters[keypath];
  if (!getter) {
    getter = _getters[keypath] = new Function("target", "return target." + keypath); 
  }
  try {
    return getter(target);
  } catch(e) { }
}

/**
 */

extend(HTTPDatabase.prototype, {
  run: function(operation, next) {
    
    var method = operation.method || this.methods[operation.name];
    if (!method) return next();

    var path = operation.path.replace(/:([^\/]+)/g, function(keypath) {
      return _get(operation, keypath.substr(1));
    });

    var transform = operation.transform || function(data) {
      return data;
    };

    this.request({
      uri: path,
      method: method,
      body: operation.data,
    }, function(err, body) {
      if (err) return next(err);
      next(null, transform(body));
    }); 
  }
});

/**
 */

module.exports = function(options) {

  var db = new HTTPDatabase(options);

  return function() {
    return through.obj(function(operation, enc, next) {
      var self = this;
      db.run(operation, function(err, data) {
        if (err) return next(err);
        self.push(data);
        next();
      })
    });
  };
};