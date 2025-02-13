require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Person = require("./models/Person");
const { register } = require("module");

const app = express();
const port = process.env.port||3000;

//Create public folder as static
app.use(express.static(path.join(__dirname,"public")));

//Set up middleware to parse json requests
app.use(bodyParser.json());
app.use(express.urlencoded({extended:true}));

//sets up the session variable
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{secure:false}// Set to true is using https
}));

//Create a fake user in our database
// const user = {
//     admin:bcrypt.hashSync("12345", 10)
// }

function isAuthenticated(req,res, next){
    if(req.session.user)return next();
    return res.redirect("/login");
}



//MongoDB connection setup
const mongoURI = process.env.MONGODB_URI;//"mongodb://localhost:27017/crudapp";
mongoose.connect(mongoURI);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error"));
db.once("open", ()=>{
    console.log("Connected to MongoDB Database");
});


  
//App Routes

app.get("/register", (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "register.html"));
})

app.post("/register", async (req,res)=>{
    try{
        const {username, password, email} = req.body;

        const existingUser = await User.findOne({username});

        if(existingUser){
            return res.send("Username already taken. Try a different one")
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = new User({username, password:hashedPassword, email});
        await newUser.save();

        res.redirect("/login");

    }catch(err){
        res.status(500).send("Error registering new user.");
    }
});

app.get("/",(req,res)=>{
    res.sendFile("index.html");
});

app.get("/users",isAuthenticated, (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "users.html"));
});

app.get("/login",(req,res)=>{
    res.sendFile(path.join(__dirname  + "/public/login.html"));
})

//Read routes
app.get("/people", async (req, res)=>{
    try{
        const people = await Person.find();
        res.json(people);
        console.log(people);
    }catch(err){
        res.status(500).json({error:"Failed to get people."});
    }
});

app.get("/people/:id", async (req,res)=>{
    try{
        console.log(req.params.id);
        const person = await Person.findById(req.params.id);
        if(!person){
            return res.status(404).json({error:"{Person not found}"});
        }
        res.json(person);

    }catch(err){
        res.status(500).json({error:"Failed to get person."});
    }
});

//Create routes
app.post("/addperson", async (req, res)=>{
    try{
        const newPerson = new Person(req.body);
        const savePerson = await newPerson.save();
        //res.status(201).json(savePerson);
        res.redirect("/users");
        console.log(savePerson);
    }catch(err){
        res.status(501).json({error:"Failed to add new person."});
    }
});

app.post("/login", async (req,res)=>{
    const {username, password} = req.body;
    console.log(req.body);

    const user = await User.findOne({username});

    if(user && bcrypt.compareSync(password, user.password)){
        req.session.user = username;
        return res.redirect("/users");
    }
    req.session.error = "Invalid User";
    return res.redirect("/login")
});

app.get("/logout", (req,res)=>{
    req.session.destroy(()=>{
        res.redirect("/login");
    })
});

//Update Route
app.put("/updateperson/:id", (req,res)=>{
    //Example of a promise statement for async fucntion
    Person.findByIdAndUpdate(req.params.id, req.body, {
        new:true,
        runValidators:true
    }).then((updatedPerson)=>{
        if(!updatedPerson){
            return res.status().json({error:"Failed to find person."});
        }
        res.json(updatedPerson);
    }).catch((err)=>{
        res.status(400).json({error:"Failed to update the person."});
    });
});

//Delete route
app.delete("/deleteperson/firstname", async (req,res)=>{
    try{
        const personname = req.query;
        const person = await Person.find(personname);

        if(person.length === 0){
            return res.status(404).json({error:"Failed to find the person."});
        }

        const deletedPerson = await Person.findOneAndDelete(personname);
        res.json({message:"Person deleted Successfully"});

    }catch(err){
        console.log(err);
        res.status(404).json({error:"Person not found"});
    }
});

//Starts the server
app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
