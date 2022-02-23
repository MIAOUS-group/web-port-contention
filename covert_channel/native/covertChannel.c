/*!
   \file covertChannel.c
   Main interface for the native part of the covert channel
   \author Thomas Rokicki
   \date 19/11/2021
*/

#define _GNU_SOURCE

#include "covertChannel.h"
#include "config.h"
#include "sender.h"
#include "receiver.h"
#include "frame.h"
#include "hammingCode.h"


#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <time.h>


/*!
   \fn int waitRequestFrame ()
   Wrapper for the listener. Waits for a frame, and check validity
   \return Sequence number if the frame is correct, code otherwise
*/
int waitRequestFrame() {
  if (DEBUG) printf("Listening...\n");
  requestFrame rFrame = multiListen();
  if ((rFrame.initSeq == 10) & (rFrame.sequenceNumber < 16)) {
    return rFrame.sequenceNumber;
  }
  else {
    return INVALID_FRAME;
  }
}



/*!
   \fn int main ()
   Main function of the covert channel. Handles listening and sending
   as well as synchronization
*/
int main() {
  printf("Starting covert channel...\n");
  struct timespec t;
  struct timespec tt;
  // This is a sleep time between receiving a message and start emitting.
  // Useful because JS can take a while to switch from emitting to listening
  t.tv_nsec = 2000000; //in ns, so here 2ms
  char *test_sequence="azertyuiopqsdfgh"; // Test sequence for quick test purposes, add more data to make more realistic tests
  while(1) {
    /**
     * The sender always act in reaction.
     * We wait for a request, we send data.
    **/
    int nextSequenceNumber = waitRequestFrame(); // Wait for a frame
    if ((nextSequenceNumber >= 0) & (nextSequenceNumber < 16)) { // Seems like a valid frame
      nanosleep(&t, &tt); // Pause time to let js switch to listening
      multiThreadedSender(test_sequence[nextSequenceNumber], nextSequenceNumber); // Answer
    }
    else if (nextSequenceNumber == INVALID_FRAME){
      if (DEBUG) printf("Invalid frame received, waiting for another request.\n");
    }
  }
}
