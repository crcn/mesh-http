var http      = require("..");
var crudlet   = require("crudlet");
var sinon     = require("sinon");
var express   = require("express");
var supertest = require("supertest");

describe(__filename + "#", function() {

  var server, agent;

  before(function() {
    var server = express();
    server.post("/path", function(req, res) {
      res.send({ name: "blarg" });
    });
    var agent  = supertest(server);
  });

  after(function() {
    // server.close();
  })


  it("can run a get request", function(next) {


    crudlet.stream(http({ agent: agent })).on("data", function() {
      next()
    }).write(crudlet.operation("insert", { path: "/ab" }));
  });
});