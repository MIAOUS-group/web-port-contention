/**
* This module implements the main function to send bits from the browser by
* creating contention on port 1.
**/


/**
 * sendOne - Send a bit to one by creating contention on port 1.
 *
 * @param  {Number} bitDuration    The duration of a bit, i.e. for how long we create contention (in ms)
 * @param  {Function} spamFunction The WebAssembly function to create contention on port 1. i64.ctz works best.
 * @return {Number}                1 if everything ok
 */
function sendOne(bitDuration, spamFunction) {
  var startTime;
  startTime = performance.now();
  while (performance.now() < (startTime + bitDuration)) {  // As we send bit in the order of the ms with a jitter over ~10us it's okay, lower values might be more impacted
    spamFunction(13); //
  }
  return 1;
}



/**
 * sendZero - Send a bit to 0 by not doing anything
 *
 * @param  {int} bitDuration The duration of a bit, i.e. for how long we wait (in ms)
 * @return {Number}          1 if everything ok
 */
function sendZero(bitDuration) {
  var startTime;
  startTime = performance.now();
  while (performance.now() < (startTime + bitDuration)) {} // Wait for the whole bit duration
  return 1;
}


/**
 * sendSequence - Send a sequence of bits by creating or not contention on port 1
 *
 * @param  {Number} bitDuration    The duration of a bit, i.e. for how long we create contention or wait(in ms)
 * @param  {Array[Number]} sequence           Array containing the bits to send
 * @param  {Function} spamFunction = null Function to create contention. By default it is initialized to i64.ctz.
 * @return {Number}                1 if everything ok
 */
async function sendSequence(bitDuration, sequence, spamFunction = null) {
  if (spamFunction === null) {
    var spamFunction = await initCTZSpam(); // Initialize the function to create contention.
    // i32.ctz works best, but we left the parameter to try other functions.
  }
  sendZero(bitDuration)
  for (var bitIndex = 0; bitIndex < sequence.length; bitIndex++) {
    if (sequence[bitIndex] == 1) {
      sendOne(bitDuration, spamFunction)
    }
    else if (sequence[bitIndex] == 0) {
      sendZero(bitDuration);
    }
    else {
      console.log("Error while sending sequence, invalid bit: ", sequence[bitIndex]);
    }
  }
  return 1;
}
