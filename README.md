```javascript
var crudlet = require("crudlet");
var http = require("crudlet-http");
var db = crudlet.child(http(), {
  path: function(operation) {
    return {
      "insert": "/people",
      "update": "/people/:data._id",
      "remove": "/people/:data._id",
      "load": operation.multi ? "/people" : "/people/:data._id"
    }[operation.name];
  }
});

crudlet.stream(db).end(crudlet.operation("insert", {
  data: { name: "abba" }
}));
```