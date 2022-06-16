require('dotenv').config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
// const encrypt = require('mongoose-encryption');
// const bcrypt = require("bcrypt");
const passport = require("passport");
// const localStrategy = require("passport-local").Strategy;
const session = require('express-session');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require("passport-facebook");

// create app
const app = express();
//access to css files
app.use(express.static('public'));
//read values and user inputs from request data
app.use(bodyParser.urlencoded({
  extended: true
}));
//using ejs for rendering
app.set("view engine", "ejs");
// initialize session
app.use(session({
  secret: "yet another password",
  resave: false,
  saveUninitialized: false
}));
//  initializing passport and express-session.
app.use(passport.initialize());
app.use(passport.session());
// create and connect database
mongoose.connect("mongodb://localhost:27017/secretsUserDB");
//schema definition
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});
//plugins for the schema defintion
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);
// add passport configuration.
passport.use(User.createStrategy());
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
  // if you use Model.id as your idAttribute maybe you'd want
  // done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
app.get("/", function(req, res) {
  res.render("home");
});
app.get("/auth/google", passport.authenticate('google', {
  scope: ["profile"]
}));
app.get("/auth/facebook", passport.authenticate('facebook'));

app.get("/auth/google/secrets", passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    res.redirect('/secrets');
  })
app.get("/auth/facebook/secrets", passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    res.redirect('/secrets');
  })
app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, function(err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate('local')(req, res, function() {
          res.redirect("/secrets");
        })
      }
    });
  });

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {

    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, function() {
          res.redirect('/secrets');
        });
      }

    });

  });
app.route("/secrets")
  .get(function(req, res) {
    User.find({"secret":{$ne:null}},function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
          res.render("secrets",{usersWithSecret:foundUser});
        }
      }
    });
  });
app.route("/submit")
  .get(function(req, res) {
    if(req.isAuthenticated()){
      res.render("submit");
    }else{
      res.redirect("/login");
    }
  })
  .post(function(req,res){
    const newSecret = req.body.secret;
    User.findById(req.user.id,function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
        foundUser.secret = newSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  })
  });

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });

});
app.listen(3000, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log("successfully started server on port 3000.");
  }
})
