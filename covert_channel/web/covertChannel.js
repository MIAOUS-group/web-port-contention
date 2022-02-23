
/**
 * request - Sends a request frame.
 * Async function, use it with await !
 *
 * @param  {Object} ccState             State of the covert channel.
 * @param  {Function} spamFunction      Function used to send bits by creating
 * contention on port 1. We generally use i64.ctz spamming
 */
async function request(ccState, spamFunction) {
  if (DEBUG) console.log("Sending request for frame number ", ccState.sequenceNumber);
  var request = createRequestFrame(ccState.sequenceNumber);
  if (DEBUG) console.log(request)
  await sendSequence(BIT_DURATION, request, spamFunction=spamFunction);
  if (DEBUG) console.log("Done sending, waiting for answer...");
}



/**
 * waitAnswer - Wait for a data frame and process it
 *
 * @param  {Object} ccState             State of the covert channel.
 * @param  {Function} spamFunction      Function used to receive bits by creating
 * contention on port 1. We generally use i64.ctz spamming
 * @param  {Object} clock               SharedArray buffer clock
 * @return {Number}                     A code, showing if the frame is valid or not
 */
async function waitAnswer(ccState, spam, clock) {
  var answer = await listenDen(spamFunction = spam, clock=clock);
  if (answer == TIMEOUT) {
    return TIMEOUT
  }
  else {
    var frame = decodeDataFrame(answer['bits']);
    if ((frame != INVALID_CODE) && (frame !=INVALID_INIT_SEQ) && frame.sequenceNumber == ccState.sequenceNumber  && alphabet.includes(getData(bits))) {
      if (DEBUG) {
        console.log("Received valid frame");
        console.log("Sequence number: ", ccState.sequenceNumber, " Data: ", frame.data);
      }
      ccState.sequenceNumber = (ccState.sequenceNumber+1)%16;
      ccState.data += frame.data;
      return VALID_ANSWER
    }
    else {
      return INVALID_FRAME
    }
  }
}



/**
 * initCovertChannel - Main function of the web component of the covert channel.
 * It initalize the spam functions, clocks and all necessary objects.
 *
 * Then it sends a request and wait for an answer and so on and so on.
 * It also handles timeout or invalid frame by resending a request
 *
 * @param  {Number} sequenceNumber Starting sequence number
 */
async function initCovertChannel(sequenceNumber=0) {
  var failedPacketCount = 0; // Used for stats about packet loss
  var ccState = { // this object represents the state of the covert channel
    sequenceNumber: sequenceNumber,
    data: '',
  }
  var ctz_spam = await initCTZSpam(); // Function used to send bits
  var rem_spam = await initREMSpam(); // Function used to receive bits
  var clock = await initSAB(atomic = true);
  var start = performance.now() // used fir stats
  var evaluationByteNumber = 100 // We evaluate over this many bytes
  console.log("Starting covert channel")
  while(true) {
    await request(ccState, ctz_spam); // send request
    var answer = await waitAnswer(ccState, rem_spam, clock); // wait for answer
    if (answer == VALID_ANSWER) {
      if(DEBUG) console.log(ccState);
    }

    // If something went wrong, we resend a request
    else if (answer == TIMEOUT){
      if (DEBUG) console.log("Timeout while waiting for data, resending request...")
      failedPacketCount++;
    }
    else if (answer == INVALID_FRAME){
      if (DEBUG) console.log("Invalid frame received. Waiting and resending request...")
      failedPacketCount++;
    }

    // statss
    if (ccState.data.length == evaluationByteNumber) {
      elapsedTime = performance.now()-start
      Bps = (evaluationByteNumber / elapsedTime)*1000
      bps = Bps*8
      console.log("Execution time: ", elapsedTime, "ms")
      console.log("Bitrate: ", bps, " bps")
      console.log("Failed packet: ", failedPacketCount);
      console.log(ccState.data)
      break;
    }
  }

  // SAB worker are very performance consuming, better kill it
  await clock.worker.terminate()
}
