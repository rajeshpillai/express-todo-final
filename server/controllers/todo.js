const mongodb = require("mongodb");


exports.Index = function (req, res) {
    var db = req.db;
    var testData = req.query.testdata;
    //?testdata=1  (load test data)
    if (testData) {
       stubTodos(db);
       res.end("ok. Test data populated!");
    }

    try {
      var cursor = db.collection("todos")
          .find()
          .toArray(function(err, results) {
              if (err)   console.log(`${err}`);
              res.render("index.ejs", {todos: results});
          });
    } catch (e) {
      console.log(`${e}`);
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
    console.log("isAJAX: ", isAjax);
    var id = new mongodb.ObjectID(req.body.id);
    var completed = req.body.completed;
    completed = (completed == "true" ? "false" : "true");
    db.collection("todos")
      .update({_id:id},
        { $set: {completed: completed}}, function (err,response) {
          if (err) console.log("toggleCompleted: ERROR: ", err);
          if (isAjax) {
            res.json({id: id.toString(), status: completed});
          }
          else {
            res.redirect("/");
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
    res.redirect("/");
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
  res.redirect("/");
};

exports.UpdateTodo =  function (req, res) {
    var db = req.db;
    var id = new mongodb.ObjectID(req.body.id);
    console.log("udpate: ", req.body.todo);
    db.collection("todos")
        .update({_id:id},{$set: {name:req.body.name, todo:req.body.todo}},
            function(err, result){
             });

    res.redirect("/");
};

exports.CreateTodo = (req, res) => {
    var db = req.db;
    console.log("Creating todo: ", req.body);
    req.body.createdAt = new Date();
    req.body.completed = false;
    db.collection("todos").save(req.body, (err, result) => {
        if (err) return console.log(err);
        console.log("Saved to the database!");
        res.redirect("/");
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
