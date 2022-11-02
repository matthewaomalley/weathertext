// function that returns the date
exports.getDate = function () {

    var today = new Date();
    var day = String(today.getDate()).padStart(2, '0');
    var month = String(today.getMonth() + 1).padStart(2, '0');
    var year = today.getFullYear();
    let thisDate = month + '/' + day + '/' + year;
    
    return (thisDate);
  }
  
// function that returns the day of the week
exports.getDay = function () {

    const x = new Date();
    let thisDay = x.getDay();
  
    if (thisDay == "1") {
      thisDay = 'Monday'
    } else if (thisDay == "2") {
      thisDay = 'Tuesday'
    } else if (thisDay == "3") {
      thisDay = 'Wednesday'
    } else if (thisDay == "4") {
      thisDay = 'Thursday'
    } else if (thisDay == "5") {
      thisDay = 'Friday'
    } else if (thisDay == "6") {
      thisDay = 'Saturday'
    } else if (thisDay == "0") {
      thisDay = 'Sunday' }
      return (thisDay)
  }