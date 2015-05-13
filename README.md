HTTP (api) adapter for [mesh](http://github.com/mojo-js/mesh.js).

Simple example:

```javascript
var mesh = require("mesh");
var http = require("mesh-http");
var db = mesh.child(http(), {
  prefix: "/api"
});

// POST /api/people
db(mesh.op("insert", {
  collection: "people",
  data: { name: "abba" }
}))

// this also works too:
db(mesh.op("insert", {
  path: "/people",

  // overridable
  method: "POST",

  // keep collection to make sure your API is interoperable
  // with other mesh adapters
  collection: "people",
  data: { name: "abba" }
}))
```

#### http + [caplet](https://github.com/mojo-js/caplet.js) example

```javascript
var caplet = require("caplet");
var mesh   = require("mesh")
var http   = require("mesh-http");
var _      = require("highland");

var db = http({
  prefix: "/api",
  path: function (operation) {

    var path = "";
    var cpath;
    var mpath;

    if (operation.owner) {
      path += "/" + operation.owner.collectionName;
    }

    cpath = path + "/" + operation.collection;
    mpath = cpath + "/" + (operation.data ? operation.data.uid : void 0);

    return {
      "insert" : cpath,
      "update" : mpath,
      "upsert" : operation.data && operation.data.uid ? mpath : cpath,
      "load"   : operation.multi ? cpath : mpath,
      "remove" : mpath
    }[operation.name];
  }
});

var dbs = {
  tags  : mesh.child(db, { collection: "tags"  }),
  todos : mesh.child(db, { collection: "todos" })
};

/**
 */

var Tag = caplet.createModelClass({
});

/**
 */

var Tags = caplet.createModelClass({
  modelClass: Tag,
  load: function() {

    // GET /todos/:todo/tags
    dbs
      .tags(mesh.op("load", {
        owner: this.owner
      }))
      .pipe(_.pipeline(_.collect))
      .on("data", this.set.bind(this, "data"));
  }
});

/**
 */

var Todo = caplet.createModelClass({

  /**
   */

  collectionName: "todos",

  /**
   * properties loaded on-demand
   */

  virtuals: {
    "tags" : function() {
      var tags = Tags({ owner: this });
      tags.load();
      this.set("tags", tags);
    },

    // missing prop - load self
    "*"    : function() {
      this.load();
    }
  },

  /**
   */

  initialize: function() {
    caplet.setVirtuals(this, this.virtuals);
  },

  /**
   */

  load: function() {

    // GET /todos/:todo
    dbs
      .todos(mesh.op("load", {
        data: this
      }))
      .on("data", this.set.bind(this, "data"));
  },

  /**
   */

  save: function() {

    // POST or PUT
    dbs
      .todos(mesh.op("upsert", {
        data: this
      }))
      .on("data", this.set.bind(this, "data"));
  }
});

/**
 */

var Todos = caplet.createCollectionClass({
  modelClass: Todo,
  load: function() {

    // GET /todos
    dbs
      .todos(mesh.op("load", { multi: true })).
      .pipe(_.pipeline(_.collect))
      .on("data", this.set.bind(this, "data"));
  }
});
```

#### db httpDb(options)

Creates a new http db

- `options` - constructor args
  - `prefix` - prefix for API calls
  - `idProperty` - idProperty for models
  - `methods` - resolves method

#### db(operationName, options)

Performs a new operation on the API

- `options`
  - `path` - (optional) path to the route - automatically resolved by collection if this is omitted
  - `method` - (optional) resolved by mesh method
  - `headers` - (optional) HTTP headers


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
var peopleDb = mesh.child(db, { collection: "people" });

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

#### upsert

Upsert operation. POSTS to route if a data does not exist, or PUTS to a route if it does.

```javascript

// POST /people
peopleDb("update", {
  collection: "/people"
  data: { name: "james" },
}).on("data", function() {
  // emits updated documents
});

// PUT /people/1
peopleDb("update", {
  collection: "/people"

  // idProperty is uid by default. can be anything.
  idProperty: "uid",
  data: { uid: "1", name: "james" },
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
