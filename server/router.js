var todoController = require("./controllers/todo");

module.exports = function (app) {
  app.get("/", todoController.Index);
  app.get("/recently-completed", todoController.RecentlyCompleted);
  app.post("/toggleCompleted", todoController.ToggleCompleted);
  app.get("/toggleCompleted/:id/:completed", todoController.ToggleCompleted);

  app.get("/delete/:id", todoController.DeleteTodo);
  app.get("/edit/:id", todoController.EditTodo);
  app.post("/deleteall", todoController.DeleteAll);
  app.post("/update", todoController.UpdateTodo);
  app.post('/todos', todoController.CreateTodo);
}
