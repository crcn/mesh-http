var through    = require("through2");
var superagent = require("superagent");
var extend     = require("xtend/mutable");

/**
 */

var HTTPDatabase = function(options) {
  if (!options) options = {};
  this.options = options;
  this.agent   = options.agent || superagent;
  this.methods = options.methods || {
      "insert" : "post",
      "update" : "put",
      "load"   : "get",
      "remove" : "del"
  };
}

/**
 */

extend(HTTPDatabase.prototype, {
  run: function(operation, next) {
    var method = operation.method || this.methods[operation.name];
    if (!method) return next();

    // todo - take params out of path
    var request = this.agent[method](operation.path.replace(/:\w+/g, function() {
      console.log("ROUTE");
    }));

    request.end(function(err) {
      if (err) return next(err);
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