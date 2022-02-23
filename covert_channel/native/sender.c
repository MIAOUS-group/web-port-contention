#define _GNU_SOURCE

#include "sender.h"
#include "config.h"

#include "sendBit.h"
#include "p1_spam.h"
#include "frame.h"


#include <stdio.h>
#include <stdbool.h>
#include <math.h>
#include <unistd.h>
#include <pthread.h>


// Given a char, convert it into a frame and send it.
// This is the base sending function of the data link layer.
int send(char message, int sequenceNumber) {
  int frameSize = DATA_FRAME_SIZE;
  bool frame[frameSize];
  long bitDuration = BIT_DURATION;

  createDataFrame(message, sequenceNumber, frame, frameSize);
  if (DEBUG){
    for (int i = 0; i < DATA_FRAME_SIZE; i ++) {
      printf("%i", frame[i]);
    }
    printf("\n");
  }
  sendSequence(bitDuration, frame, frameSize);
  return 1;
}

// Wrapper of sender to be used with pthread
// vargp is a void pointer pointing to a the dataframe to send.
void *sendWrapper(void *vargp) {
  dataFrame *dFrame = (dataFrame *)vargp;
  send(dFrame->data, dFrame->sequenceNumber);
  return NULL;
}


/// Main sender function.
// Creates a sender on each physical core.
// Waits for all sender to finish to return
int multiThreadedSender(char message, int sequenceNumber) {
  if(DEBUG) printf("Sending data frame:\n\t message: %c, \n\t sequenceNumber: %i\n",message, sequenceNumber );
  dataFrame dFrame;
  dFrame.data = message;
  dFrame.sequenceNumber = sequenceNumber;
  cpu_set_t cpuset;
  pthread_t threads[PHY_CORE];

  for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
    pthread_create(&threads[threadNumber], NULL, sendWrapper, (void *)&dFrame);
    CPU_ZERO(&cpuset);
    CPU_SET(threadNumber, &cpuset);
    pthread_setaffinity_np(threads[threadNumber], sizeof(cpuset), &cpuset);
  }
  for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
    pthread_join(threads[threadNumber], NULL);
  }
  return 1;
}
