var stream  = require("obj-stream");
var request = require("request");
var extend  = require("xtend/mutable");
var qs      = require("querystring");

/**
 */

var HTTPDatabase = function(options) {
  if (!options) options = {};

  this.options    = options;
  this.request    = options.request    || request;
  this.idProperty = options.idProperty || "uid";

  this.methods = options.methods || {
      "insert" : "post",
      "update" : "put",
      "load"   : "get",
      "remove" : "del"
  };

  this.path    = function(operation) {

    var modelPath = operation.data ? "/" + operation.collection + "/" + operation.data[this.idProperty] : "";
    return {
      "insert" : "/" + operation.collection,
      "update" : modelPath,
      "load"   : operation.multi ? "/" + operation.collection : modelPath,
      "remove" : modelPath
    }[operation.name];
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

    var options = extend({}, operation.http, operation);

    var method = options.method || this.methods[options.name];

    if (typeof method === "function") {
      method = method(options);
    }

    if (!method) return next();

    var path = options.path || this.path;

    if (typeof path === "function") {
      path = path.call(this, options);
    }

    path = path.replace(/:([^\/]+)/g, function(keypath) {
      return _get(options, keypath.substr(1));
    });

    var transform = options.transform || function(data) {
      return data;
    };

    var headers = options.headers;
    if (typeof headers === "function") {
      headers = headers.call(this, operation);
    }

    var query = options.query;
    if (typeof query === "function") {
      query = query(operation);
    }


    this.request({
      uri: path + (query ? "?" + qs.stringify(query) : ""),
      method: method,
      body: options.data,
      headers: headers
    }, function(err, body) {
      if (err) return next(err);
      next(null, transform(body));
    }); 
  }
});

/**
 */

function _toArray(data) {
  if (data == void 0) return [];
  return Object.prototype.toString.call(data) === "[object Array]" ? data : [data]
}

/**
 */

module.exports = function(options) {

  var db = new HTTPDatabase(options);

  return function(name, options) {
    var writable = stream.writable();

    process.nextTick(function() {
      var self = this;
      db.run(extend({ name: name }, options), function(err, data) {
        if (err) return writable.reader.emit("error");
        _toArray(data).forEach(writable.write.bind(writable));
        writable.end();
      })
    });

    return writable.reader;
  };
};