const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");

const app = express();

mongoose.connect("mongodb://localhost:27017/secretsUserDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
const User = new mongoose.model("User", userSchema);



app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static('public'));
app.get("/", function(req, res) {
  res.render("home");
});
app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
      User.findOne({
          email: req.body.username
        }, function(err, docs) {
          if (!err) {
            if (docs) {
              if (docs.password === req.body.password) {
                res.render("secrets");
              } else {
                res.send("Your email and password did not match. Please try again.");
              }
            } else {
              res.send("There is no user with that email address in our data.");
            }
          } else {
            res.send(err);
          }
        });
      });

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {
    const user = new User({
      email: req.body.username,
      password: req.body.password
    });
    user.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        res.render("secrets");
      }
    });

  });
app.get("/submit", function(req, res) {
  res.render("submit");
});
app.listen(3000, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log("successfully started server on port 3000.");
  }
})
