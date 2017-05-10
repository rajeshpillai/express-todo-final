"use strict";

const express = require("express");
const process = require("process");
const layout = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;

const mongodb = require("mongodb");
const cluster = require('cluster');

const app = express();

app.set("view engine", 'ejs');
app.use(layout);

app.use("/public", express.static(__dirname + "/public"));
app.use("/bower_components", express.static(__dirname +  "/bower_components"));

var port = 8888;

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));


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

    app.listen(port, function () {
        console.log(`Listening on port ${port}`);
    });
});

app.use(function (req, res, next) {
  console.log("LOGGER: ", process.pid);
  req.db = db;
  next();
})

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

require("./server/router")(app);
