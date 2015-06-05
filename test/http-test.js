var http    = require("..");
var mesh = require("mesh");
var expect  = require("expect.js");

describe(__filename + "#", function() {

  var requests;
  var db;

  function request(options, next) {
    requests.push(options);
    next(null, options.data);
  }

  beforeEach(function() {
    requests = [];
  });

  it("can customize the methods", function(next) {
    var stream = mesh.open(http({
      request: request,
      method: function(operation) {
        return {
          "insert" : "a",
          "update" : "b",
          "load"   : "c",
          "remove" : "d"
        }[operation.name];
      }
    }));
    stream.on("end", function() {
      expect(requests[0].method).to.be("a");
      expect(requests[1].method).to.be("b");
      expect(requests[2].method).to.be("c");
      expect(requests[3].method).to.be("d");
      next();
    });

    stream.write(mesh.operation("insert", { path: "/ab" }));
    stream.write(mesh.operation("update", { path: "/ab" }));
    stream.write(mesh.operation("load", { path: "/ab" }));
    stream.end(mesh.operation("remove", { path: "/ab" }));

  });

  it("can run a get request", function(next) {
    mesh.open(http({ request: request })).on("end", function() {
      expect(requests[0].method).to.be("post");
      expect(requests[0].uri).to.be("/ab");
      next();
    }).end(mesh.operation("insert", { path: "/ab" }));
  });

  it("method can be function", function(next) {
    var stream = mesh.open(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].method).to.be("patch");
      next();
    });
    stream.end(mesh.operation("insert", { data: { name: "blarg" }, path:"/a", method: function(operation) {
      expect(operation.path).to.be("/a");
      return "patch";
    }}));
  });

  it("can use a transform function for the response", function(next) {
    var stream = mesh.open(http({ request: request }));
    stream.on("data", function(data) {
      expect(data.data.name).to.be("blarg");
      next();
    }).end(mesh.operation("insert", {
      data: { name: "blarg" },
      path: "/a",
      transform: function(data) {
        return { data: data };
      }
    }));
  });

  it("can provide custom http headers", function(next) {
    var stream = mesh.open(http({ request: request }));

    stream.on("end", function() {
      expect(requests[0].headers.ua).to.be("b");
      next();
    });
    stream.end(mesh.operation("insert", { data: { name: "blarg" }, path:"/a", headers: { ua: "b" } }));
  });

  it("headers can be a function", function(next) {
    var stream = mesh.open(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].headers.ua).to.be("b");
      next();
    });
    stream.end(mesh.operation("insert", { data: { name: "blarg" }, path:"/a", headers: function(operation) {
      expect(operation.path).to.be("/a");
      return { ua: "b" };
    } }));
  });

  it("can add a query", function(next) {
    var stream = mesh.open(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].uri).to.be("/a");
      expect(requests[0].query.ua).to.be("b");
      next();
    });
    stream.end(mesh.operation("insert", { data: { name: "blarg" }, path:"/a", query: {ua:"b"}}));
  });

  it("query can be a function", function(next) {
    var stream = mesh.open(http({ request: request }));
    stream.on("end", function() {
      expect(requests[0].query.ua).to.be("b");
      next();
    });
    stream.end(mesh.operation("insert", { data: { name: "blarg" }, path:"/a", query: function(operation) {
      expect(operation.path).to.be("/a");
      return { ua: "b" };
    } }));
  });

  it("automatically maps the path based on the collection", function(next) {

    var stream = mesh.open(http({
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

    stream.write(mesh.operation("insert", { collection: "people", data: { uid: "1" }}));
    stream.write(mesh.operation("update", { collection: "people", data: { uid: "1" }}));
    stream.write(mesh.operation("load", { collection: "people", data: { uid: "1" }}));
    stream.write(mesh.operation("load", { collection: "people",  multi: true, data: { uid: "1" }}));
    stream.write(mesh.operation("remove", { collection: "people", data: { uid: "1" }}));
    stream.end();

  });


  it("can add a prefix", function(next) {
    var stream = mesh.open(http({
      prefix: "/api",
      request: request
    }));
    stream.on("end", function() {
      expect(requests[0].uri).to.be("/api/people");
      next();
    });
    stream.end(mesh.operation("insert", { collection: "people", data: { uid: "1" }}));
  });

  it("can add a prefix in the operation", function(next) {
    var stream = mesh.open(http({
      request: request
    }));
    stream.on("end", function() {
      expect(requests[0].uri).to.be("/api/people");
      next();
    });
    stream.end(mesh.operation("insert", { prefix: "/api", collection: "people", data: { uid: "1" }}));
  });

  it("can upsert and insert a value", function(next) {
    var db = http({
      request: request
    });

    db(mesh.operation("upsert", {
      collection: "people",
      data: { name: "a" }
    })).on("end", function() {
      expect(requests[0].uri).to.be("/people");
      expect(requests[0].method).to.be("post");
      next();
    });
  });

  it("can upsert and update a value", function(next) {
    var db = http({
      request: request
    });

    db(mesh.operation("upsert", {
      collection: "people",
      data: { uid: "a" }
    })).on("end", function() {
      expect(requests[0].uri).to.be("/people/a");
      expect(requests[0].method).to.be("put");
      next();
    });
  });

  it("doesn't add query if obj exists", function(next) {
    var db = http({
      request: request
    });

    db(mesh.operation("upsert", {
      collection: "people",
      data: { uid: "a" },
      query: {}
    })).on("end", function() {
      expect(requests[0].uri).to.be("/people/a");
      expect(requests[0].method).to.be("put");
      next();
    });
  });

  it("passes data to body if it's a string", function(next) {
    var db = http({
      request: request
    });

    db(mesh.operation("upsert", {
      collection: "people",
      data: "abc",
      query: {}
    })).on("end", function() {
      expect(requests[0].uri).to.be("/people");
      expect(requests[0].data).to.be("abc");
      next();
    });
  });

  it("can use fully qualified urls for the path", function(next) {
    var db = http({
      request: request
    });

    db({ path: "http://localhost:8080/route" }).on("end", function() {
      expect(requests[0].uri).to.be("http://localhost:8080/route");
      expect(requests[0].method).to.be("GET");
      next();
    });
  });
});
