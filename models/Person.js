const mongoose = require("mongoose");

//Setup Mongoose Schema
const peopleSchema = new mongoose.Schema({
    firstname:String,
    lastname:String,
    email:String
});

const Person = mongoose.model("Person", peopleSchema, "peopledata");

module.exports = Person;