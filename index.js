// require fetch for API handling
const theCron = require('node-cron');
const fetch = require('node-fetch');
const baseURL = 'http://dog-api.kinduff.com/api/facts';

// Cron schedule calls the function to call API and send msg every day at 8
//theCron.schedule("0 8 * * * *", () => {
theCron.schedule("*/1 * * * * *", () => {
  getDogFact(); })

// function gets the fact from the API and sends it to the message function
function getDogFact() {
  fetch(baseURL)
  .then(resp => resp.json())
  .then(data => sendTheMessage(data));
}

// function sends the message received from getDogFact() via twilio texting service
function sendTheMessage(data) {
  //var fact = data["facts"].toString();
  var fact = "test"
  //const fact = process.argv.slice(2);
  
  // will have a list that gets numbers sent from client appended to
  //var numbersToMessage = ["+17088461717", "+16308630495", "+16302926215", "+16304418223"]
  var numbersToMessage = ["+17088461717"]

  numbersToMessage.forEach(function(number){
    var message = client.messages.create({
      body: fact,
      from: '+18315746652',
      to: number
    })
    .then(message =>  console.log(message.status))
    .done();
});
}

// Download the helper library from https://www.twilio.com/docs/node/install
// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = require('twilio')(accountSid, authToken);

// create app with express
const express = require('express')
const app = express()
var url = require('url')
app.use(express.static(__dirname + '/static'))
const port = process.env.PORT || 8080;

// listen on the port
app.listen(port, () => console.log(
  `Express started on http://localhost:${port}; ` +
  `press Ctrl-C to terminate.`))