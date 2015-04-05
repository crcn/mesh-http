var http    = require("..");
var crudlet = require("crudlet");
var expect  = require("expect.js");

describe(__filename + "#", function() {

  var requests;
  var db;

  function request(options, next) {
    requests.push(options);
    next(null, options.body);
  }

  beforeEach(function() {
    requests = [];
  });

  it("can customize the methods", function(next) {
    var stream = crudlet.open(http({
      request: request,
      methods: {
        "insert" : "a",
        "update" : "b",
        "load"   : "c",
        "remove" : "d"
      }
    }));
    stream.on("end", function() {
      expect(requests[0].method).to.be("a");
      expect(requests[1].method).to.be("b");
      expect(requests[2].method).to.be("c");
      expect(requests[3].method).to.be("d");
      next();
    });

    stream.write(crudlet.operation("insert", { path: "/ab" }));
    stream.write(crudlet.operation("update", { path: "/ab" }));
    stream.write(crudlet.operation("load", { path: "/ab" }));
    stream.end(crudlet.operation("remove", { path: "/ab" }));

  });

  it("can run a get request", function(next) {
    crudlet.open(http({ request: request })).on("end", function() {
      expect(requests[0].method).to.be("post");
      expect(requests[0].uri).to.be("/ab");
      next();
    }).end(crudlet.operation("insert", { path: "/ab" }));
  });

  it("can pass params in the path", function(next) {
    var stream = crudlet.stream(http({ request: request })).on("end", function() {
      expect(requests[0].uri).to.be("/blarg");
      next();
    }).end(crudlet.operation("insert", { data: { name: "blarg" }, path: "/:data.name" }));
  });

  it("can have http specific params", function(next) {
    var stream = crudlet.stream(http({ request: request })).
    on("end", function() {
      expect(requests[0].uri).to.be("/blarg");
      next();
    }).end(crudlet.operation("insert", { http: { data: { name: "blarg" }, path: "/:data.name" }}));
  });

  it("path can be a function", function(next) {
    var stream = crudlet.stream(http({ request: request })).
    on("end", function() {
      expect(requests[0].uri).to.be("/blarg");
      next();
    }).end(crudlet.operation("insert", { data: { name: "blarg" }, path: function(op) {
      expect(op.name).to.be("insert");
      return "/:data.name";
    }}));
  });

  it("method can be function", function(next) {
    var stream = crudlet.stream(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].method).to.be("patch");
      next();
    });
    stream.end(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", method: function(operation) {
      expect(operation.path).to.be("/a");
      return "patch";
    }}));
  });

  it("can use a transform function for the response", function(next) {
    var stream = crudlet.stream(http({ request: request }));
    stream.on("data", function(data) {
      expect(data.data.name).to.be("blarg");
      next();
    }).end(crudlet.operation("insert", {
      data: { name: "blarg" },
      path: "/a",
      transform: function(data) {
        return { data: data };
      }
    }));
  });

  it("can provide custom http headers", function(next) {
    var stream = crudlet.stream(http({ request: request }));

    stream.on("end", function() {
      expect(requests[0].headers.ua).to.be("b");
      next();
    });
    stream.end(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", headers: { ua: "b" } }));
  });

  it("headers can be a function", function(next) {
    var stream = crudlet.stream(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].headers.ua).to.be("b");
      next();
    });
    stream.end(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", headers: function(operation) {
      expect(operation.path).to.be("/a");
      return { ua: "b" };
    } }));
  });

  it("can add a query", function(next) {
    var stream = crudlet.stream(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].uri).to.be("/a?ua=b");
      next();
    });
    stream.end(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", query: {ua:"b"}}));
  });

  it("query can be a function", function(next) {
    var stream = crudlet.stream(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].uri).to.be("/a?ua=b");
      next();
    });
    stream.end(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", query: function(operation) {
      expect(operation.path).to.be("/a");
      return { ua: "b" };
    } }));
  });

  it("automatically maps the path based on the collection", function(next) {

    var stream = crudlet.stream(http({
      request: request
    }));

    stream.on("end", function() {
      expect(requests[0].uri).to.be("/people");
      expect(requests[1].uri).to.be("/people/1");
      expect(requests[2].uri).to.be("/people/1");
      expect(requests[3].uri).to.be("/people");
      expect(requests[4].uri).to.be("/people/1");
      next();
    });

    stream.write(crudlet.operation("insert", { collection: "people", data: { uid: "1" }}));
    stream.write(crudlet.operation("update", { collection: "people", data: { uid: "1" }}));
    stream.write(crudlet.operation("load", { collection: "people", data: { uid: "1" }}));
    stream.write(crudlet.operation("load", { collection: "people",  multi: true, data: { uid: "1" }}));
    stream.write(crudlet.operation("remove", { collection: "people", data: { uid: "1" }}));
    stream.end();

  });

  xit("can change the idProperty", function() {
  });

  it("can add a prefix", function(next) {
    var stream = crudlet.stream(http({
      prefix: "/api",
      request: request
    }));
    stream.on("end", function() {
      expect(requests[0].uri).to.be("/api/people");
      next();
    });
    stream.end(crudlet.operation("insert", { collection: "people", data: { uid: "1" }}));
  });

  it("can add a prefix in the operation", function(next) {
    var stream = crudlet.stream(http({
      request: request
    }));
    stream.on("end", function() {
      expect(requests[0].uri).to.be("/api/people");
      next();
    });
    stream.end(crudlet.operation("insert", { prefix: "/api", collection: "people", data: { uid: "1" }}));
  });

});
