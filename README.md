API adapter for [crudlet](http://github.com/mojo-js/crudlet.js).

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

#### db httpDb(options)

Creates a new http db

- `options` - constructor args
  - `prefix` - prefix for API calls
  - `idProperty` - idProperty for models
  - `methods` - resolves method

#### db(operationName, options)

Performs a new operation on the API:

```javascript

// automatically resolves to DELETE /people?age={$gt:0}
db("remove", {
  collection: "people",
  query: {
    age: { $gt: 0 }
  }
}).on("data", function() {

});
```

#### insert

Insert operation.

```javascript
var peopleDb = crud.child(db, { collection: "people" });

// resolves to POST /people with data as body
peopleDb("insert", { data: [{ name: "john"}, { name: "matt" }]}).on("data", function() {
  // this is called twice.
});
```

#### update

Update operation

```javascript

// resolves to PUT /people/:id
peopleDb("update", {
  collection: "/people"
  query: { /* mongodb query here */ },
  data: { /* data to update*/ },
}).on("data", function() {
  // emits updated documents
});
```

#### remove

Removes a document

```javascript
peopleDb("remove", {
  query: { /* mongodb query here */ },
  data: { /* data to update*/ },
  multi: true, // TRUE if you want to remove multiple items
}).on("end", function() {

});
```

#### load

Removes a document

```javascript
peopleDb("load", {
  query: { /* mongodb query here */ },
  multi: true, // TRUE if you want to load multiple items
}).on("data", function() {

});
```
