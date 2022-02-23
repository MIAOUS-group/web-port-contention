/**
* This module is a JavaScript implementation of (4,8) Hamming Code.
* We use these code to detect errors on the 4 bits of sequence number in the
* request frame.
* It also helps to shuffle 0s and 1s in the frame which reduce insertion/deletion
* errors.
*
* (4,8) codes allow the detection of two bit flip and the correction of a single bitflip.
**/


/**                                CONSTANTS                                 **/


const ACTUAL_BIT = 4; // Number of data bits to encode

const PARITY_BITS = 4; // Number of paritity bits

const CODED_BITS = ACTUAL_BIT + PARITY_BITS; // Length of the encoded sequence

const CONTROL_MATRIX = // Matric to encode / decode hamming transormation.
math.matrix([
  [0,0,0,1,1,1,1],
  [0,1,1,0,0,1,1],
  [1,0,1,0,1,0,1]
]);



/**                              Encode/Decode                               **/


/**
 * hammingEncode - Encode a given bit message with (4,8) hamming code.
 * It is typically used on sequence numbers.
 *
 * @param  {Array[int]} message Bit array contanining the message
 * @return {Array[int]}         Bit array containing the encoded message
 */
function hammingEncode(message) {
  if (message.length == ACTUAL_BIT) {
    encodedMessage = new Array(CODED_BITS).fill(0);
    // Data bits:
    encodedMessage[2] = message[0];
    encodedMessage[4] = message[1];
    encodedMessage[5] = message[2];
    encodedMessage[6] = message[3];

    // Parity bits:
    encodedMessage[0] = message[0] ^ message[1] ^ message[3];
    encodedMessage[1] = message[0] ^ message[2] ^ message[3];
    encodedMessage[3] = message[1] ^ message[2] ^ message[3];
    encodedMessage[7] = encodedMessage[0] ^ encodedMessage[1] ^ encodedMessage[2] ^ encodedMessage[3] ^ encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6];

    return encodedMessage;
  }
  else {
    console.log("Invalid message length for hamming codes");
  }
}



/**
 * hammingErrorCount - Count the number of error in a Hamming-encoded bit sequence
 *  We don't use the error correcting properties of the code.
 * That is because most of our errors are insertion or deletion of bits, not
 * bitflip.
 *
 *
 * @param  {Array[int]} encodedMessage Bit array containing the encoded message
 * @return {Number}                    Number of error in the message (Up to two)
 */
function hammingErrorCount(encodedMessage) {
  correctCode = true
  if (encodedMessage.length == CODED_BITS) {
    correctCode &= (encodedMessage[0] == encodedMessage[2] ^ encodedMessage[4] ^ encodedMessage[6]);
    correctCode &= (encodedMessage[1] == encodedMessage[2] ^ encodedMessage[5] ^ encodedMessage[6]);
    correctCode &= (encodedMessage[3] == encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6]);
    correctCode &= (encodedMessage[7] == encodedMessage[0] ^ encodedMessage[1] ^ encodedMessage[2] ^ encodedMessage[3] ^ encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6]);
    if (correctCode) { // Good no error !
      return 0;
    }
    else { // Single Error, this could be corrected - although we don't do it because this could be a false positive due to deletion or insertion
      if (encodedMessage[7] != encodedMessage[0] ^ encodedMessage[1] ^ encodedMessage[2] ^ encodedMessage[3] ^ encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6]) { // Single error
        return 1
      }
      else { // Double error (or more)
        return 2
      }
    }
  }
}



/**
 * hammingCorrectError - Correct a Hamming-encoded sequence with a single error
 *
 * @param  {type} encodedMessage Array of bits corresponding to the encoded sequence
 */
function hammingCorrectError(encodedMessage){
  var messageMatrix = math.matrix([encodedMessage[0],encodedMessage[1],encodedMessage[2],encodedMessage[3],encodedMessage[4],encodedMessage[5],encodedMessage[6]]);
  var check = math.multiply(CONTROL_MATRIX,messageMatrix);
  errorIndex = (check._data[0]%2)*4 + (check._data[1]%2)*2 + (check._data[2]%2) - 1;
  encodedMessage[errorIndex] ^= 1;
}




/**
 * hammingDecode - Decode a given bit message with (4,8) hamming code.
 * It is typically used on sequence numbers.
 * It also checks if the sequence is valid, but does not correct error.
 *
 * @param  {type} encodedMessage Bit array containing the encoded message
 * @return {type}                Bit array containing the decoded message
 */
function hammingDecode(encodedMessage) {
  errorCount = hammingErrorCount(encodedMessage)
  if (errorCount == 1) {
    correctedMessage = hammingCorrectError(encodedMessage);
    return -1;
  }
  else if (errorCount > 1) {
    console.log("Double error detected, cannot correct");
    return -1;
  }
  console.log(encodedMessage);
  decodedMessage = new Array(ACTUAL_BIT).fill(0);
  decodedMessage[0] = encodedMessage[2];
  decodedMessage[1] = encodedMessage[4];
  decodedMessage[2] = encodedMessage[5];
  decodedMessage[3] = encodedMessage[6];
  return decodedMessage;
}
