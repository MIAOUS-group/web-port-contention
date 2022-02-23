const DEBUG = 0; // set to 1 if you want plots and prints.
// However, the covert channel will not work correctly with it

/******************************* Covert Channel *******************************/

BIT_DURATION = 1; // Duration of a bit in milliseconds, ie the time we create (or not) contention.



// Length of our packet and parts (in bits).
const DATA_FRAME_SIZE = 21;
const REQUEST_FRAME_SIZE = 12;
const INIT_SEQ_SIZE = 4;
const SEQ_NB_SIZE = 4;
const DATA_SIZE = 8;
const CODE_SIZE = 5


// CODES
const INVALID_FRAME_SIZE = "INVALID_FRAME_SIZE";
const INVALID_INIT_SEQ = "INVALID_INIT_SEQ";
const INVALID_CODE = "INVALID_CODE";
const TIMEOUT = "TIMEOUT"
const INVALID_FRAME = "INVALID_FRAME"
const VALID_ANSWER = "VALID_ANSWER"

// PROTOCOL TIME
const DATA_TIMEOUT = 70; // The time the receiver waits for a data frame (in ms)
const REQUEST_TIMEOUT = 50; // The time the sender waits for a request frame (in ms)


alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','?',',','!','.',' ']
