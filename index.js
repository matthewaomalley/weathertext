// import packages
const theCron = require('node-cron');
const fetch = require('node-fetch');
var dt = require('./date-time');

// api keys
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const weatherKey = process.env.WEATHER_KEY;
const zipKey = process.env.ZIPCODE_KEY;
const client = require('twilio')(accountSid, authToken);

// import firebase module
var fb = require('firebase')

// initialize the app
var appIni = fb.initializeApp({
  apiKey: process.env.FIREBASE_KEY,
  authDomain: "weathertext-52a34.firebaseapp.com",
  databaseURL: "https://weathertext-52a34-default-rtdb.firebaseio.com",
  projectId: "weathertext-52a34",
  storageBucket: "weathertext-52a34.appspot.com",
  messagingSenderId: "91968737153",
  appId: process.env.FIREBASE_ID
});

// create firebase instance
var firebaseDB = fb.database()

// Cron schedule calls the function to call API and send msg every day at 8
//theCron.schedule("0 8 * * * *", () => {
//theCron.schedule("*/1 * * * * *", () => {
  //getDogFact(); })

// testing main functionality. -- will have cron doing it's job here --

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

allEncompass();
function allEncompass() {
  let userNum = "";
  let userZip = "";
  
  // load data from firebase
  firebaseDB.ref(`users/`).once('value').then((snapshot) => {
    Object.values(snapshot.val()).forEach(val => {
      sleep(2000).then(() => {  // sleep 2 seconds between each due to api call limitations
        userNum = (val["num"]).trim();
        userZip = (val["zip"]).trim();
        callZip(userNum, userZip)
      });
    });
  });
}

// calls the zip api to return lat, lon, city data
function callZip(userNum, userZip) {

  let zipAPI = `https://app.zipcodebase.com/api/v1/search?apikey=${zipKey}&codes=${userZip}&country=US`

  fetch(zipAPI)
  .then(resp => resp.json())
  .then(zipData => getWeather(zipData, userNum, userZip))
}

// function that calls the weather API and sends the result to a send function
function getWeather(zipData, userNum, zipcode) {

  // create variables from data and send as api arguments
  let currZip = (zipData["results"][zipcode][0])
  let city = (currZip["city"]);
  let lat = (currZip["latitude"]);
  let lon = (currZip["longitude"]);

let weatherAPI = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=
${lon}&exclude=current,minutely,hourly,alerts&units=imperial&appid=${weatherKey}`

  fetch(weatherAPI)
  .then(resp => resp.json())
  .then(data => sendIt(data, city, userNum))
}

// function that recieves parsed data from api fetch and sends it as a formatted text message
function sendIt(data, city, userNum) {

  // get the day and date from date-time functions
  let thisDate = dt.getDate();
  let thisDay = dt.getDay();

  // instance of current day data
  const currDay = (data["daily"][0]);

  // get the the weather, weather code, and assign description
  const currWeather = (currDay["weather"][0]);
  const weatherCode = (currWeather["id"]);
  let weatherDesc = (currWeather["description"]);

  // include 'a' for thunderstorm weather so it is grammatically correct
  if ((weatherCode >= 200 && weatherCode <= 232) || (weatherCode == 800)) {
    weatherDesc = "a " + weatherDesc;
  }

  // parse out the rounded temperatures
  let minTemp = parseFloat(currDay["temp"]["min"]).toFixed(0)
  let avgTempDay = parseFloat(currDay["temp"]["day"]).toFixed(0)
  let maxTemp = parseFloat(currDay["temp"]["max"]).toFixed(0)

  // create string with parsed variables and day/date/weather data
  let theMessage = thisDay + ", " + thisDate + "\n" + city + "'s temp will be " + avgTempDay + "\u00B0 " +
  "(high " + "of " + maxTemp + "\u00B0 & low of " + minTemp + "\u00B0). Expect " + weatherDesc + "."
  
  // string of messages for the for each function (will always be only one)
  var numbersToMessage = [userNum]
  
  // send the message
  numbersToMessage.forEach(function(number){
    var message = client.messages.create({
      body: theMessage,
      from: '+18315746652',
      to: number
    })
    .then(message =>  console.log("Message sent to: " + userNum))
    .done();
  });
}

// function that sends a welcome message when a user registers
function sendWelc(firstName, number) {

  let theMessage = "Welcome to WeatherText " + firstName + "!"
  var numbersToMessage = [number]
  
  // send the message
  numbersToMessage.forEach(function(number){
    var message = client.messages.create({
      body: theMessage,
      from: '+18315746652',
      to: number
    })
    .then(message =>  console.log("Welcome message sent to:" + number))
    .done();
  });
}

// create app with express
const express = require('express')
const app = express()
var url = require('url');
const { waitForDebugger } = require('inspector');
app.use(express.static(__dirname + '/static'))
const port = process.env.PORT || 8080;

// get user info from client and send to firebase
app.get('/grabInfo', (request, response) => {
    var inputs = url.parse(request.url, true).query
    const number = (inputs.number)
    const firstName = (inputs.fname)
    const lastName = (inputs.lname)
    const zipcode = (inputs.zipcode)
    response.send("success")

    // send a welcome text when a user registers
    sendWelc(firstName, number);

    // create the user via firebase database
    firebaseDB.ref('users/' + number).set({
      first: firstName,
      last: lastName,
      num: number,
      zip: zipcode
    });
});

app.get('/removeUser', (request, response) => {
  // remove user from firebase database and return success message TESTING THIS TO SEE IF WE CAN DELETE ENTIRE THING BY NUM REFERENCE
  var inputs = url.parse(request.url, true).query
  const number = (inputs.number)
  firebaseDB.ref(`users/` + number).remove()
  .then(function() {
    response.send("Successfully unsubscribed.")
  })
});

// listen on the port
app.listen(port, () => console.log(
  `Express started on http://localhost:${port}; ` +
  `press Ctrl-C to terminate.`))