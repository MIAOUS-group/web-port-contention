#ifndef CONFIG_H
#define CONFIG_H

#define DEBUG 0 // Set to 1 for a lot of prints, data output etc
#define PHY_CORE 4 // Number of physical cores, change it for your setup
#define DATA_FRAME_SIZE 21 // Bit size of a data frame
#define REQUEST_FRAME_SIZE 12 // Bit size of a request frame


//Number of repetition of the spam function when we receive bits
#define RECEIVER_REP (1<<7)

//Number of repetition of the spam function when we send bits
#define SENDER_REP (1<<8)


#define DATA_TIMEOUT 70*1000000 // ns
#define REQUEST_TIMEOUT 50*1000000 // ns
#define BIT_DURATION (1000000) //in ns



// CODES
#define VALID_ANSWER -1
#define INVALID_FRAME -2
#define TIMEOUT -3


#endif
