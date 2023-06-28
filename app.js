const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const port = 3000;

var indexRouter = require("./routes/index");
var reportsRouter = require("./routes/reports");

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "report")));
app.use("/reports", reportsRouter);
app.use("/", indexRouter);


app.listen(port, () => console.log(`Example app listening on port ${port}!`));
