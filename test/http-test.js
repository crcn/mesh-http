var http    = require("..");
var crudlet = require("crudlet");
var expect  = require("expect.js");

describe(__filename + "#", function() {

  var requests, db;

  function request(options, next) {
    requests.push(options);
    next(null, options.body);
  }

  beforeEach(function() {
    requests = [];
  });

  it("can customize the methods", function() {
    var stream = crudlet.stream(http({ 
      request: request,
      methods: {
        "insert" : "a",
        "update" : "b",
        "load"   : "c",
        "remove" : "d"
      }
    }));
    stream.write(crudlet.operation("insert", { path: "/ab" }));
    stream.write(crudlet.operation("update", { path: "/ab" }));
    stream.write(crudlet.operation("load", { path: "/ab" }));
    stream.write(crudlet.operation("remove", { path: "/ab" }));

    expect(requests[0].method).to.be("a");
    expect(requests[1].method).to.be("b");
    expect(requests[2].method).to.be("c");
    expect(requests[3].method).to.be("d");
  });


  it("can run a get request", function() {
    crudlet.stream(http({ request: request })).write(crudlet.operation("insert", { path: "/ab" }));
    expect(requests[0].method).to.be("post");
    expect(requests[0].uri).to.be("/ab");
  });

  it("can pass params in the path", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { data: { name: "blarg" }, path: "/:data.name" }));
    expect(requests[0].uri).to.be("/blarg");
  });


  it("can have http specific params", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { http: { data: { name: "blarg" }, path: "/:data.name" }}));
    expect(requests[0].uri).to.be("/blarg");
  });

  it("path can be a function", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { data: { name: "blarg" }, path: function(op) {
      expect(op.name).to.be("insert");
      return "/:data.name";
    }}));
    expect(requests[0].uri).to.be("/blarg");
  });

  it("method can be function", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", method: function(operation) {
      expect(operation.path).to.be("/a");
      return "patch";
    }}));
    expect(requests[0].method).to.be("patch");
  });

  it("can use a transform function for the response", function(next) {
    var stream = crudlet.stream(http({ request: request }));
    stream.on("data", function(data) {
      expect(data.data.name).to.be("blarg");
      next();
    }).write(crudlet.operation("insert", { 
      data: { name: "blarg" }, 
      path: "/a",
      transform: function(data) {
        return { data: data }
      }
    }));
  });

  it("can provide custom http headers", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", headers: { ua: "b" } }));
    expect(requests[0].headers.ua).to.be("b");
  });

  it("headers can be a function", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", headers: function(operation) {
      expect(operation.path).to.be("/a");
      return { ua: "b" };
    } }));
    expect(requests[0].headers.ua).to.be("b");
  });

  it("can add a query", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", query: {ua:"b"}}));
    expect(requests[0].uri).to.be("/a?ua=b");
  });

  it("query can be a function", function() {
    var stream = crudlet.stream(http({ request: request }));
    stream.write(crudlet.operation("insert", { data: { name: "blarg" }, path:"/a", query: function(operation) {
      expect(operation.path).to.be("/a");
      return { ua: "b" };
    } }));
    expect(requests[0].uri).to.be("/a?ua=b");
  });

});