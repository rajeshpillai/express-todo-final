const mongodb = require("mongodb");

const redis = require("redis"),
      redisClient = redis.createClient();

redisClient.on("connect", function () {
    console.log("Connected to REDIS.");
});

exports.Index = function (req, res) {
    var db = req.db;
    var testData = req.query.testdata;
    //?testdata=1  (load test data)
    if (testData) {
       stubTodos(db);
       res.end("ok. Test data populated!");
    }

    redisClient.get("todos", function(err, reply) {
        if (reply) {  // if key found
            var todos = JSON.parse(reply);
            console.log("redis:get:");
            res.render("index.ejs", todos);
        }
        else {
             console.log("from DB: ");
            fetchFromDB();
        }
    });

    function fetchFromDB() {
        try {
            var cursor = db.collection("todos")
                .find()
                .toArray(function(err, results) {
                    if (err)   {
                        console.log(`${err}`);
                        return;
                    }
                    console.log("STORING todos in REDIS:");
                    redisClient.set("todos", JSON.stringify({todos: results}));
                    redisClient.expire("todos",15);

                    res.render("index.ejs", {todos: results});
                });
            } catch (e) {
             console.log(`${e}`);
            }
    }
};

// Get 5 recently completed todos
exports.RecentlyCompleted =  function (req, res) {
    try {
      var db = req.db;
      var cursor = db.collection("todos")
          .find()
          .sort("createdAt",-1)
          .filter({completed: "true"}).
          limit(5)
          .toArray(function(err, results) {
              if (err)   console.log(`RecentlyCompleted: ERROR: ${err}`);
              res.json({todos: results});
          });
      //res.sendFile(__dirname + "/index.html");
    } catch (e) {
      console.log(`ERROR:${e}`);
    }
};

exports.ToggleCompleted = function (req, res) {
    var db = req.db;
    var isAjax = req.xhr || (req.headers.accept.indexOf("json") > -1);
    var id = new mongodb.ObjectID(req.body.id || req.params.id);
    var completed = (req.body.completed || req.params.completed);
    completed = (completed == "true" ? "false" : "true");
    db.collection("todos")
      .update({_id:id},
        { $set: {completed: completed}}, function (err,response) {
          if (err) console.log("toggleCompleted: ERROR: ", err);
          if (isAjax) {
            res.json({id: id.toString(), status: completed});
          }
          else {
              redisClient.del("todos", function (err, reply) {
              res.redirect("/");
            });
          }
        }
      );
};

exports.DeleteTodo = function (req, res) {
    var db = req.db;
    console.log("deleting todo with id: ", req.params.id);
    var id = new mongodb.ObjectID(req.params.id);
    db.collection('todos').remove({_id: id}, function(err, collection) {
        console.log(err);
    });

    redisClient.del("todos", function (err, reply) {
        res.redirect("/");
    });
};

exports.EditTodo = function (req, res) {
    var db = req.db;
    console.log("editing todo with id: ", req.params.id);

    var id = new mongodb.ObjectID(req.params.id);

     db.collection("todos").find({_id: id}).toArray().then(function (data){
        console.log("todo: ", data[0]);
        var todo = data[0];
         res.render("edit.ejs", {todo: todo});
    });

};

exports.DeleteAll =  function (req, res) {
  var db = req.db;
  var isAjax = req.xhr || (req.headers.accept.indexOf("json") > -1);

  console.log("REQUEST: deleteAll");

  db.collection("todos").deleteMany();

  if (isAjax) {
    res.end("ok");
    return;
  }
  redisClient.del("todos", function (err, reply) {
        res.redirect("/");
  });
};

exports.UpdateTodo =  function (req, res) {
    var db = req.db;
    var id = new mongodb.ObjectID(req.body.id);
    console.log("udpate: ", req.body.todo);
    db.collection("todos")
        .update({_id:id},{$set: {name:req.body.name, todo:req.body.todo}},
            function(err, result){
             });


   redisClient.del("todos", function (err, reply) {
        res.redirect("/");
   });
};

exports.CreateTodo = (req, res) => {
    var db = req.db;
    console.log("Creating todo: ", req.body);
    req.body.createdAt = new Date();
    req.body.completed = false;
    db.collection("todos").save(req.body, (err, result) => {
        if (err) return console.log(err);
        console.log("Saved to the database!");
        redisClient.del("todos", function (err, reply) {
             res.redirect("/");
        });
    });
};

function stubTodos (db) {
  var todo = {
    name: "rajesh",
    todo: "Task "
  };
  var count = 1;

  function add(count) {
    if (count > 10) return;

    var task = Object.assign({}, todo,
      {todo: "Task " + count,
      createdAt: new Date(),
      completed: false
    });

    if (count % 2 == 0) {
        task.completed = true;
    }
    db.collection("todos").save(task, (err, result) => {
        if (err) return console.log(err);
        console.log("Saved to the database!", task._id);
        count++;
        add(count);
    });
  }
  add(count);
}
