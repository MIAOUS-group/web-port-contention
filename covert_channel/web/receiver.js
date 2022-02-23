async function clocklessListener(clock, spamFunction) {
  var begin,end;
  /*
  * In the covert channel, we use the Atomic version of the browser.
  * It is based on a concurrent access library.
  * It makes every access a bit longer (thus reducing the resolution).
  * However, it seems to reduce the rate of temporal outliers, such as 0 timestamps
  * or particularly high outliers
  */
  begin = Atomics.load(clock.array,0);
  var a = spamFunction(BigInt(13));
  end = Atomics.load(clock.array,0);
  return(end-begin)
}



/**
 * listenDen - Main receiver function.
 * It listens for a full frame (or wait until timeouts).
 * To listen, it repeatedly times the execution of a spam function, measuring
 * contention on port 1.
 *
 * This function feeds our detector for each new measurement, and stops when
 * it receives a full frame - thus ensuring the synchronisation without a shared
 * clock.
 *
 * Ths is an async function, use it with await.
 *
 * Both the spam function and clock can be passed as an argument to save time.
 *
 * @param  {Function} spamFunction=null  Function creating contention on port 1.
 * This is what we actually measure. Initialize it beforehand to save time.
 * We use i64.rem_u by default.
 * @param  {Object} clock=null           SharedArrayBuffer clock.
 * Pass a already initialized clock in the parameter to save time.
 * @param  {Array(Number)} frameSize = DATA_FRAME_SIZE  Size of a data frame.
 * @return {Object}                      An object containing the received bits
 * as well as the detector results object.
 */
async function listenDen(spamFunction=null, clock=null, frameSize = DATA_FRAME_SIZE) {
  if (DEBUG) console.log("Listening");

  if (spamFunction === null) {
    // By default we use rem_u to receive bits
    // However, as the instantiation takes some time, we can pass the function
    // as a param and instantiate it only once.
    var spamFunction = await initREMSpam();
  }

  if (clock === null) {
    // By default we use Shared Array Buffer to time.
    // However, as the instantiation takes some time, we can pass the function
    // as a param and instantiate it only once.
    var clock = await initSAB(atomic = true);
  }

  // We apply a sliding window with a median to smoothen the results and remove
  // outliers
  var medianSize = 3 // This is the size of the window
  //  We use typed array. That is because median requires to sort the array,
  // and this is WAY faster on a typed array.
  var medianArray = new Uint16Array(medianSize).fill(0);

  // Data to plot afterwards:
  if (DEBUG) {
    var Xs = [] // X axis
    var points = [] // Timing measurements (post median)
  }
  var index = 0
  /**
   * We use a detector, whether based on DenStream or threshold detection (or hybrid).
   * In each case, we use it to parse each new point.
   * It also let the receiver know the number of received bits, to know when to
   * stop listening.
  **/
  var thresholdResults = initThresholdDetection(JMP_THRESHOLD);

  var start = performance.now(); // Used for timeouts

  /**
   * Main receiver loop.
   * While we don't have all the bits of the frame, or reach the timeout,
   * we measure the execution time of our rem_u spam function.
   * Each time, we smoothen the data with a median and add it to our detector
   * based on DenStream or simple threshold.
  **/
  while ((performance.now() < start + DATA_TIMEOUT) & (thresholdResults.bitCount < DATA_FRAME_SIZE) ) {
    for (var i = 0; i < medianSize; i ++) {
      medianArray[i] = await clocklessListener(clock, spamFunction);
    }
    point = median(medianArray);
    parseNewPointThreshold(point, thresholdResults); //  This is the main function
    // parsing points by our detector.
    // This is the function that will also modify thresholdResults.bitCount,
    // letting the listener stop automatically at the end of the frame.

    if (DEBUG) { // Add data for plots
      Xs.push(index);
      points.push(point);
      index++
    }
  }


  // Here, we have theoretically received a whole frame, lets decode it.
  bits = getBitsThreshold(thresholdResults);

  /**
   * Most of the error in the code comes from insertion or deletion of bits.
   * Particularly, the stem from how we detect and count bits.
   * Both only detect when the signal goes from 0 to 1 or vice versa.
   * Hence, we only detect sequence of same bits, but we don't know how many
   * actual bits are in this sequence.
   *
   * To determine it, we count the number of measurements we have in a sequence.
   * Then, by dividing it by the average bit duration (computed with the init
   * sequence), we can guess the actual number of bits in a sequence.
   *
   * However, this can raise a few issues. Sometimes, certain sequences have
   * variation in the bit size, and this can lead to insertion or deletion of bits.
   *
   * To do so, when we receive an incorrect sequence, we try to reinterpret it
   * with slightly different average bitsize (bit offset here) to try to correct
   * these errors.
   *
  **/
  if (!checkCode(bits) & checkInitSequence(bits) & !alphabet.includes(getData(bits))) {
    mainLoop:
    for (var bit0offset = -3; bit0offset <= 3; bit0offset+=2) {
      for (var bit1offset = -3; bit1offset <= 3; bit1offset+=2) {
        if (bit1offset != 0 | bit0offset !=0) { //Don't check the default frame since its already incorect
          bits = getBitsThresholdCustom(thresholdResults, thresholdResults.bitSize[0] - bit0offset, thresholdResults.bitSize[1] + bit1offset);
          if (checkCode(bits) & checkInitSequence(bits) & alphabet.includes(getData(bits))) {
            break mainLoop; // breaks out of the two nested loops.
          }
        }
      }
    }
  }
  if (DEBUG) {
    console.log(bits)
    plotEvolution(Xs, points);
  }

  return {bits: bits, results: thresholdResults}
}



/**
 * plotEvolution - Plot the timings measured with our listener.
 * Essentially used to see the frame on a graph, easier to debug
 *
 * @param  {Array(Number)} Xs     X axis (experiment index)
 * @param  {Array(Number)} points Y axis (execution time)
 */
function plotEvolution(Xs, points) {
  var data = [
  {
    y: points,
    x: Xs,
    type: 'bar'
  }
];
Plotly.newPlot('bar-chart', data); // You need to have a div called bar-chart
}
