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
const { MessagingResponse } = require('twilio').twiml;
const bodyParser = require('body-parser');

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

// Optional interactive mode for testing
if (process.argv.length == 4) {
  callZip(process.argv[2], process.argv[3])
}

// create firebase instance
var firebaseDB = fb.database()

// Cron scheduler to start the process at 6 A.M. CST
theCron.schedule("0 12 * * *", function() {
  startIt(); });

// function that reads the database and passes each user's num and zip to next function
function startIt() {
  let userNum = "";
  let userZip = "";
  
  // load data from firebase and send a call every second
  firebaseDB.ref(`users/`).once('value').then((snapshot) => {
    Object.values(snapshot.val()).forEach((val, i) => {
      setTimeout(() => {
        userNum = (val["num"]).trim();
        userZip = (val["zip"]).trim();
        callZip(userNum, userZip)
      }, i * 1000);
    });
  });
}

// calls the zip api to return lat, lon, city data for each number and zipcode from database
function callZip(userNum, userZip) {

  let zipAPI = `https://app.zipcodebase.com/api/v1/search?apikey=${zipKey}&codes=${userZip}&country=US`

  fetch(zipAPI)
  .then(resp => resp.json())
  .then(zipData => getWeather(zipData, userNum, userZip)) // send lat and lon to func that needs it to call weather API
}

// function that uses lat and lon values to get weather data, parses it and sends data to SMS send function
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

  // include 'a' for thunderstorm weather so it is grammatically correct + clear sky description
  if ((weatherCode >= 200 && weatherCode <= 232) || (weatherCode == 800) || (weatherCode == 801)) {
    weatherDesc = "a " + weatherDesc;
  }

  // parse out the rounded temperatures
  let minTemp = parseFloat(currDay["temp"]["min"]).toFixed(0)
  let avgTempDay = parseFloat(currDay["temp"]["day"]).toFixed(0)
  let maxTemp = parseFloat(currDay["temp"]["max"]).toFixed(0)

  // city string to determine if city name will have an s at the end or a ', to be grammatically correct.
  let cityString = ""
  if (city.charAt(city.length-1) == "s") {
    cityString = city + "'" } else { cityString = city + "'s" }

  // create string with parsed variables and day/date/weather data
  let theMessage = thisDay + ", " + thisDate + "\n" + cityString + " temp will be " + avgTempDay + "\u00B0 " +
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

  let theMessage = "Welcome to WeatherText " + firstName + "! You will receive a" +
  " WeatherText every morning at 6:00 A.M.\n\nReply STOP to unsubscribe, or visit" +
  " our website."

  var numbersToMessage = [number]
  
  // send the message
  numbersToMessage.forEach(function(number){
    var message = client.messages.create({
      body: theMessage,
      from: '+18315746652',
      to: number
    })
    .then(message =>  console.log("Welcome message sent to: " + number))
    .done();
  });
}

// create app with express
const express = require('express')
const app = express()
var url = require('url');
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

// function that removes user and user data from database
app.get('/removeUser', (request, response) => {
  var inputs = url.parse(request.url, true).query
  const number = (inputs.number)

  firebaseDB.ref(`users/${number}`).once('value').then((snapshot) => {
    if (snapshot.exists()) {
      firebaseDB.ref(`users/` + number).remove()
      .then(function() {
        response.send("success")
      });
    } else {
      response.send("failure")
    }
  });
});

// SMS responses
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();
  let userRes = req.body.Body;

  if ((userRes == 'STOP') || (userRes == "Stop") || (userRes == "stop")) {
    twiml.message('You have been unsubscribed.\nVisit our website to re-enroll: ' +
    'https://weathertext.azurewebsites.net');
  } else if ((!isNaN(userRes) == true) && (userRes.length == 5)) {
    console.log(req.Body)


    twiml.message('Goodbye');
  } else {
    twiml.message(
      'Text STOP to unsubscribe or enter a zipcode to get the weather');
}
  res.type('text/xml').send(twiml.toString());
});

// listen on the port
app.listen(port, () => console.log(
  `Express started on http://localhost:${port}; ` +
  `press Ctrl-C to terminate.`))