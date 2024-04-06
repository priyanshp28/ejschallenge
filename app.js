//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");

const session=require("express-session");
const passport=require("passport");
const passportlocal=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const homeStartingContent = "LNCT Group of College is one of the Top engineering college in Bhopal, MP and Central India. LNCT Synonymous with excellence in higher education with 30+ Years of Academic Excellence and Discipline.";
const aboutContent = "Enthusiastic learner of web development with a successful project demonstrating proficiency in creating user-friendly websites with modern design elements and smooth navigation.";
const contactContent= ["priyanshporwal28@gmail.com","sindhwanihardik806@gmail.com" ,  "pardhirachana@gmail.com"];

let app = express();

const posts=[];
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


app.use(session({
  secret: 'thisisalongunusabestringwhichnoonecanaccess',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongourl")
.then(function () {
  console.log("connected to db");
})


const registerschema = new mongoose.Schema({
  email: String,
  password:String,
  googleId:String,
  secret:String
})

registerschema.plugin(passportlocal);
registerschema.plugin(findOrCreate);
const User=new mongoose.model("User",registerschema);
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
async function (accessToken, refreshToken, profile, done) {
  try {
    console.log(profile);
    // Find or create user in your database
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // Create new user in database
      const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
      const newUser = new User({
        username: profile.displayName,
        googleId: profile.id
      });
      user = await newUser.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}
));



app.get("/", function(req,res)
{
  //  res.render("home",{startingContent:homeStartingContent, posts: posts});
  res.render("home");
   
});
app.get("/login",function(req,res){
  res.render("login");
})

app.get("/register",function(req,res){
  res.render("register");
})

app.get("/about", function(req,res)
{
   res.render("about",{aboutcontent:aboutContent});
});

app.get("/contact", function(req,res)
{
   res.render("contact",{contactcontent:contactContent});
});

app.get("/compose",  function(req,res)
{
  res.render("compose");
});

app.get("/first",function(req,res){
  res.render("first",{
    startingcontent:homeStartingContent,
      posts:posts
  })
})
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/first');
  });
  app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });


app.post("/compose",function(req,res){
  const post={
   composecontent:req.body.content,
   composetitle:req.body.composeTitle
  }
    User.findById(req.user.id).then(function(founduser){
        if(founduser){
            founduser.newpost=post.composecontent;
            founduser.newtitle=post.composetitle;
            founduser.save();
            posts.push(post);
            res.redirect("/first");
        }
    })
  })
  
app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password).then(function(user){
      passport.authenticate("local")(req,res,function(){
          res.redirect("/first");
      })
  }).catch(function(err){
      console.log(err);
      res.redirect("/register");
  })
  
});

app.post("/login",function(req,res){
  // const username=req.body.username;
  // const password=req.body.password;
  // User.findOne({email:username}).then(function(founduser){
  //     if(founduser){
  //         bcrypt.compare(password,founduser.password).then(function(result){
  //             if(result===true){
  //                 res.render("secrets");

  //             }
  //         });

  //         }
  //     })
  const user=new User({
      username:req.body.username,
      password:req.body.password
  })
  req.login(user,function(err){
      if(err){
          console.log(err);
          res.redirect("/login");
      }else{
      passport.authenticate("local")(req,res,function(){
          res.redirect("/first");
      
      })
  }
  })
  });

app.post("/first",function(req,res){
  res.redirect("/compose");
})
app.get("/posts/:postname",function(req,res){
 const requestedtitle = _.lowerCase(req.params.postname);
  posts.forEach(function(post){
    const storedtitle = _.lowerCase(post.composetitle);

  
  if(storedtitle === requestedtitle){
    res.render("post",
    {
      title:post.composetitle,
      content:post.composecontent
    });
  }
})
});
 
app.post("/home",function(req,res){
  res.redirect("/compose");
})

app.get("/posts/:postName",function(req,res)
{
  const requestTitle= _.lowerCase(req.params.postName);
  posts.forEach(function(post)
  {
    const storedTitle= _.lowerCase(post.title);
    if(requestTitle===storedTitle)
    res.render("post",{title:post.title, body:post.content});

  })
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
