
/*
Data frames have the following format:

0                 8
| + + + + + + + + |
|  INIT |  SEQN   |
|      DATA       |
|      CODE|
| + + + + + + + + |

with the following components:
- INIT: A header sequence, always set to 1010. Its goal is to mark the start of
the frame as well as allowing the receiver to calibrate the duration of a bit,
as it varies with the core frequency.

- SEQN: A 4 bit sequence number, ranging from 0 to 15.

- DATA: The actual data transmitted. Each frames transmits a byte of data.

- CODE: Error detecting code. We use Berger Code, i.e. the number of 0 in the
packet. Since we have 16 bits to cover, we need 5 bits of code.

In this code, the frame is represented with an array of integers.
*/


/*                              Frame Decoding                                */


/**
 * getInitSequence - Reads the header sequence in the frame and returns it.
 * This function does not check the validity of the init sequence.
 *
 * @param  {Array} frame Data frame
 * @return {int}       The header sequence as a base 10 integer.
 */
function getInitSequence(frame) {
  var initSequence = 0;
  for (var i = 0; i < 4; i++){
    initSequence+= frame[i] << (3-i);
  }
  return initSequence;
}


/**
 * checkInitSequence - Check if the init sequence of a frame is valid.
 * i.e equals to 0b1010 or 0d10
 *
 * @param  {Array} bitFrame Data frame
 * @return {boolean}        True if the init sequence is valid.
 */
function checkInitSequence(bitFrame) {
  return (getInitSequence(bitFrame) == 10)
}


/**
 * getSequenceNumber - Reads the sequence number from a frame and returns it.
 *
 * @param  {Array} bitFrame Data frame
 * @return {int}            Sequence number encoded in the frame.
 */
function getSequenceNumber(bitFrame) {
  var sequenceNumber = 0;
  for (var i = 0; i < 4; i++){
    sequenceNumber+= bitFrame[4+i] << (3-i);
  }
  return sequenceNumber;
}

function getData(bitFrame) {
  var data = 0;
  for (var i = 0; i < 8; i++){
    data+= bitFrame[8+i] << (7-i);
  }
  return String.fromCharCode(data);
}



/**
 * getCode - Reads the berger code from a data frame and returns it.
 *This function does not check the validity of the code.
 *
 * @param  {Array} bitFrame Data frame
 * @return {int}           The berger code (the number of zero in the frame.)
 */
function getCode(bitFrame) {
  var bergerCode = 0;
  for (var bit = 0; bit < 5; bit++) {
    bergerCode += bitFrame[16+bit] << (4-bit);
  }
  return bergerCode;
}


/**
 * checkCode - Checks if the berger code is correct - i.e. the number of zeros
 * in the first 16 bits is equal to the value encoded in the code section of the
 * frame.
 * This let us detect if the packet is incorrect but does not allow us to correct
 * the error - or know where it is in the frame.
 *
 * @param  {Array} bitFrame Data frame
 * @return {boolean}           true if the code is valid, false otherwise.
 */
function checkCode(bitFrame) {
  var bergerCode = getCode(bitFrame);
  var zeroCount = 0;
  for (var bit = 0; bit < 16; bit ++) {
    if(bitFrame[bit] == 0) {
      zeroCount++;
    }
  }
  return (bergerCode == zeroCount)
}



/**
 * decodeDataFrame - Decode a data frame given in the array form and retrieve
 * all data: the init sequence, sequence number, data, and codes.
 *
 * This function checks the init sequence and berger code. If the frame is valid,
 * an object containing all data is returned. Otherwise, a string error is returned.
 *
 * @param  {Array} bitFrame Data frame
 * @return {Object}         Decoded frame (if valid) or string error (if invalid).
 */
function decodeDataFrame(bitFrame) {
  if (DEBUG) {
    printFrame(bitFrame);
  }
  if (bitFrame.length != DATA_FRAME_SIZE) {
    if (DEBUG) console.log("Invalid frame size.");
    return INVALID_FRAME_SIZE;
  }
  var decodedFrame = {
    initSequence: getInitSequence(bitFrame),
    sequenceNumber: getSequenceNumber(bitFrame),
    data: getData(bitFrame),
    code: getCode(bitFrame)
  }

  if (!checkCode(bitFrame)) {
    if (DEBUG) console.log("Invalid Berger Code");
    return INVALID_CODE;
  }
  if (!checkInitSequence(bitFrame)) {
    if (DEBUG) console.log("Invalid Init sequence");
    return INVALID_INIT_SEQ;
  }

  // console.log(decodedFrame)
  return decodedFrame
}







/**                              Frame encoding                              **/
/**
The web / receiver part only has one kind of packet. It is used as an ack, and a
request for the next packet.
It has the following format:
| + + + + + + + + |
|  INIT |  SEQN   |
|  SEQN |         |
| + + + + + + + + |

- INIT: A header sequence, always set to 1010. Its goal is to mark the start of
the frame as well as allowing the receiver to calibrate the duration of a bit,
as it varies with the core frequency.

- SEQN: A 4 bit sequence number, ranging from 0 to 15, encoded with hamming code


If packet N is correctly received, we send a request for SEQN = N+1
Otherwise, we resend a request for SEQN = N

**/


/**
 * setInitSequence - Sets the init sequence in an array representing a request
 * frame.
 *
 * @param  {array} frame Reference to our request frame. The 4 first bits will be
 * modified
 * @return {undefined}
 */
function setInitSequence(frame) {
  frame[0] = 1;
  frame[1] = 0;
  frame[2] = 1;
  frame[3] = 0
}

/**
 * setSequenceNumber - Sets the sequence number in an array representing a request
 * frame.
 *
 * @param  {int} sequenceNumber Sequence number to encode.
 * @param  {array} frame Reference to our request frame. Bits 4-7 will be
 * modified
 * @return {undefined}
 */
function sequenceNumberToBin(sequenceNumber) {
  seqNumBin = [0,0,0,0]
  for (var i = 0; i < 4; i++){
    seqNumBin[i] = (sequenceNumber >> (3-i)) & 1;
  }
  return seqNumBin
}


/**
 * setCode - TODO
 *
 * @param  {type} frame description
 * @return {type}       description
 */
function setEncodedSequenceNumber(frame, sequenceNumber) {
  dataBin = sequenceNumberToBin(sequenceNumber);
  encodedSeqNum = hammingEncode(dataBin);
  for (var i = 0; i < 8; i++) {
    frame[4+i] = encodedSeqNum[i];
  }
}



/**
 * createRequestFrame - Create a request frame for a given sequence number
 *
 * @param  {int} sequenceNumber
 * @return {array}                The frame as an array of bits (int).
 */
function createRequestFrame(sequenceNumber) {
  var frame = new Array(REQUEST_FRAME_SIZE);
  setInitSequence(frame);
  setEncodedSequenceNumber(frame, sequenceNumber);
  return frame
}


/*                                    Misc                                    */

function printFrame(frame){
  console.log(frame)
  frame_s = ""
  if (frame.length == 21){
    frame_s += "+-+-+-+-+-+-+-+-+";
    frame_s += "\n";
    frame_s += "|" + String(frame[0]) + " " + String(frame[1]) + " " + String(frame[2]) + " " + String(frame[3]) + "|" + String(frame[4]) + " " + String(frame[5]) + " " + String(frame[6]) + " " + String(frame[7]) + "|";
    frame_s += "\n";
    frame_s += "|" + String(frame[8]) + " " + String(frame[9]) + " " + String(frame[10]) + " " + String(frame[11]) + " " + String(frame[12]) + " " + String(frame[13]) + " " + String(frame[14]) + " " + String(frame[15]) + "|";
    frame_s += "\n";
    frame_s += "|" + String(frame[16]) + " " + String(frame[17]) + " " + String(frame[18]) + " " + String(frame[19]) + " " + String(frame[20]) + " - - -" +  "|";
    frame_s += "\n";
    frame_s += "+-+-+-+-+-+-+-+-+";
  }
  console.log(frame_s);
  return frame_s
}
