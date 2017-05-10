"use strict";

const express = require("express");
const layout = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;

const mongodb = require("mongodb");
const cluster = require('cluster');

const app = express();

app.set("view engine", 'ejs');
app.use(layout);

app.use(express.static("public"));

var port = 8888;

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use("/bower_components", express.static(__dirname +  "/bower_components"));
var db;

var requestCounter = 0;

var liveurl = "mongodb://mongouser:mongouser123@ds019668.mlab.com:19668/raj-todos";
var url = "mongodb://localhost:27017/todos";

if(cluster.isMaster){
   var cpuCount = require('os').cpus().length;
   console.log(`CPU #: ${cpuCount}`);
   for(var i = 0; i < cpuCount; i++){
    cluster.fork();
   }
   return;
}

MongoClient.connect(url, (err, database) => {
    if (err) return console.log(err);
    db = database;

    // stub todos
    //stubTodos();

    app.listen(port, function () {
        console.log(`Listening on port ${port}`);
    });

});

function stubTodos () {
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

app.get("/", function (req, res) {
    console.log(`REQUEST # : ${requestCounter++}`);

    var testData = req.query.testdata;
    //?testdata=1  (load test data)
    if (testData) {
       stubTodos();
       res.end("ok. Test data populated!");
    }

    try {
      var cursor = db.collection("todos")
          .find()
          .toArray(function(err, results) {
              if (err)   console.log(`TO ARR: ERROR: ${requestCounter} : ${err}`);
              res.render("index.ejs", {todos: results});
          });
      //res.sendFile(__dirname + "/index.html");
    } catch (e) {
      console.log(`ERROR: ${requestCounter} : ${e}`);
    }
});

// Get 5 recently completed todos
app.get("/recently-completed", function (req, res) {
    console.log(`REQUEST # : ${requestCounter++}`);
    try {
      var cursor = db.collection("todos")
          .find()
          .sort("createdAt",-1)
          .filter({completed: true}).
          limit(5)
          .toArray(function(err, results) {
              if (err)   console.log(`TO ARR: ERROR: ${requestCounter} : ${err}`);
              res.json({todos: results});
          });
      //res.sendFile(__dirname + "/index.html");
    } catch (e) {
      console.log(`ERROR: ${requestCounter} : ${e}`);
    }
});


app.get("/delete/:id", function (req, res) {
    console.log("deleting todo with id: ", req.params.id);
    var id = new mongodb.ObjectID(req.params.id);
    db.collection('todos').remove({_id: id}, function(err, collection) {
        console.log(err);
    });
    res.redirect("/");
});

app.get("/edit/:id", function (req, res) {
    console.log("editing todo with id: ", req.params.id);

    var id = new mongodb.ObjectID(req.params.id);

     db.collection("todos").find({_id: id}).toArray().then(function (data){
        console.log("todo: ", data[0]);
        var todo = data[0];
         res.render("edit.ejs", {todo: todo});
    });

});

app.post("/toggleCompleted", function (req, res) {
    console.log("ENTER toggleCompleted:");
    var id = new mongodb.ObjectID(req.body.id);
    var completed = req.body.completed;
    completed = (completed == "true" ? "false" : "true");
    db.collection("todos")
      .update({_id:id},
        { $set: {completed: completed}}, function (err,response) {
          if (err) console.log("toggleCompleted: ERROR: ", err);
          res.json({id: id.toString(), status: completed});
        }
      );
});

app.post("/deleteall", function (req, res) {
  console.log("REQUEST: deleteAll");
  db.collection("todos").deleteMany();
  res.end("ok");
});

app.post("/update", function (req, res) {
    var id = new mongodb.ObjectID(req.body.id);
    console.log("udpate: ", req.body.todo);
    db.collection("todos")
        .update({_id:id},{name:req.body.name, todo:req.body.todo},
            function(err, result){
             });

    res.redirect("/");
});

// create todo
app.post('/todos', (req, res) => {
    console.log("Creating todo: ", req.body);
    req.body.createdAt = new Date();
    req.body.completed = false;
    db.collection("todos").save(req.body, (err, result) => {
        if (err) return console.log(err);
        console.log("Saved to the database!");
        res.redirect("/");
    });
});
