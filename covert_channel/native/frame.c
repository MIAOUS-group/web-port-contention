#include "frame.h"

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <math.h>
#include "config.h"
#include "hammingCode.h"

/*
Sender frame have the following format:

| + + + + + + + + |
|  INIT |  SEQN   |
|      DATA       |
|      CODE       |
| + + + + + + + + |
*/

/*                              Frame Encoding                                */

int setInitSequence(bool *frame, int frameSize){
  frame[0] = 1;
  frame[1] = 0;
  frame[2] = 1;
  frame[3] = 0;
  return 1;
}

int setSequenceNumber(int sequenceNumber, bool *frame, int frameSize){
  frame[4] = (sequenceNumber >> 3) & 1;
  frame[5] = (sequenceNumber >> 2) & 1;
  frame[6] = (sequenceNumber >> 1) & 1;
  frame[7] = (sequenceNumber >> 0) & 1;
  return 1;

}

int setData(char data, bool *frame, int frameSize) {

  for (int i = 0; i <8; i++) {
    frame[8+i] = (data >> (7-i)) & 1;
  }
  return 1;
}


/**
We use Berger Code, ie the number of 0 in the message
We have 16 bits to encode so we need 5 bits for our code
**/
int setCode(bool *frame, int frameSize) {

  // First we compute the number of zero in the 16 first bits of our message
  int bergerValue = 0;
  for (int bit = 0; bit < 16; bit++) {
    if (frame[bit] == 0) {
      bergerValue++;
    }
  }

  // Then we encode it in the code section of the frame
  for (int bit = 0; bit < 5; bit++) {
    frame[16+bit] = (bergerValue >> (4-bit)) & 1;
  }

  return 1;
}

int createDataFrame(char data, int sequenceNumber, bool *frame, int frameSize) {

  for (int i = 0; i < frameSize; i++){
    frame[i] = 0;
  }


  setInitSequence(frame, frameSize);
  setSequenceNumber(sequenceNumber, frame, frameSize);
  setData(data, frame, frameSize);
  setCode(frame, frameSize);

  return 1;
}


/*                             Frame Decoding                                 */

bool checkInitSequence(bool *frame, int frameSize) {
  int initSequence = 0;
  for (int i = 0; i < 4; i++){
    initSequence+= frame[i] << (3-i);
  }
  return (initSequence == 10);
}

int getInitSequence(bool *frame, int frameSize) {
  int initSequence = 0;
  for (int i = 0; i < 4; i++){
    initSequence+= frame[i] << (3-i);
  }
  return initSequence;
}

int getSequenceNumber(bool *frame, int frameSize){
  int sequenceNumber = 0;
  for (int i = 0; i < 4; i++){
    sequenceNumber+= frame[4+i] << (3-i);
  }
  return sequenceNumber;
}

char getData(bool *frame, int frameSize){
  char data = 0;
  for (int i = 0; i < 8; i++){
    data+= frame[8+i] << (7-i);
  }
  return data;
}

int getBergerCode(bool *frame, int frameSize) {
  int bergerValue = 0;
  for (int bit = 0; bit < 5; bit ++) {
    bergerValue+= frame[16+bit] << (4-bit);
  }
  return bergerValue;
}

int getEncodedSequenceNumber(bool *frame, int frameSize) {
  int encodedSequenceNumber[CODED_BITS];
  for (int bit = 0; bit < CODED_BITS; bit ++) {
    encodedSequenceNumber[bit] = (int) frame[4+bit];
  }
  int decodedSequenceNumber[ACTUAL_BIT];
  int sequenceNumber = hammingDecode(encodedSequenceNumber,decodedSequenceNumber );
  return sequenceNumber;
}

dataFrame decodeDataFrame(bool *frame, int frameSize, int* sequenceNumber, char* data) {
  dataFrame decFrame;
  decFrame.initSeq = getInitSequence(frame, frameSize);
  decFrame.sequenceNumber = getSequenceNumber(frame, frameSize);
  decFrame.data = getSequenceNumber(frame, frameSize);
  decFrame.code = getBergerCode(frame, frameSize);
  return decFrame;

}

requestFrame decodeRequestFrame(bool *frame, int frameSize) {
  requestFrame decFrame;
  decFrame.initSeq = getInitSequence(frame, frameSize);
  int seqNum = getEncodedSequenceNumber(frame, frameSize);
  // printRequestFrame(frame, REQUEST_FRAME_SIZE);

  if (seqNum != -1) {
    decFrame.sequenceNumber = seqNum;
  }
  else {
    decFrame.initSeq = 0;
    return decFrame;
  }
  if (decFrame.initSeq == 10) {
    if (DEBUG) {
      printf("Valid Frame!\n");
      printf("initSequence: %u\n", decFrame.initSeq);
      printf("Sequence number: %u\n", decFrame.sequenceNumber);
    }
  }
  return decFrame;
}

int checkRequestFrame(requestFrame rframe) {
  if (rframe.initSeq == 10) {
    return 1;
  }
  else {
    return 0;
  }
}

 /*                                    Misc                                   */

int printRequestFrame(bool *frame, int frameSize) {
  if (frameSize == REQUEST_FRAME_SIZE) {
    printf("+-+-+-+-+-+-+-+-+");
    printf("\n");
    printf("|%d %d %d %d|%d %d %d %d|",frame[0],frame[1],frame[2],frame[3],frame[4],frame[5],frame[6],frame[7]);
    printf("\n");
    printf("|%d %d %d %d|        |",frame[8],frame[9],frame[10],frame[11]);
    printf("\n");
    printf("+-+-+-+-+-+-+-+-+");
    printf("\n");
    return 0;
  }
  else {
    printf("Invalid frame size");
    return 1;
  }
}

int printRequestFrame_i(int *frame, int frameSize) {
  if (frameSize == REQUEST_FRAME_SIZE) {
    printf("+-+-+-+-+-+-+-+-+");
    printf("\n");
    printf("|%i %i %i %i|%i %i %i %i|",frame[0],frame[1],frame[2],frame[3],frame[4],frame[5],frame[6],frame[7]);
    printf("\n");
    printf("|%i %i %i %i|        |",frame[8],frame[9],frame[10],frame[11]);
    printf("\n");
    printf("+-+-+-+-+-+-+-+-+");
    printf("\n");
    return 0;
  }
  else {
    printf("Invalid frame size");
    return 1;
  }
}
//
int printRequestFrame_f(requestFrame rFrame) {
  printf("+-+-+-+-+-+-+-+-+");
  printf("\n");
  printf("|%i %i %i %i|%i %i %i %i|",(rFrame.initSeq >> 3) & 1,(rFrame.initSeq >> 2) & 1,(rFrame.initSeq >> 1) & 1,(rFrame.initSeq >> 0) & 1,(rFrame.sequenceNumber >> 7) & 1,(rFrame.sequenceNumber >> 6) & 1,(rFrame.sequenceNumber >> 5) & 1,(rFrame.sequenceNumber >> 4) & 1);
  printf("\n");
  printf("|%i %i %i %i|",(rFrame.sequenceNumber >> 3) & 1,(rFrame.sequenceNumber >> 2) & 1,(rFrame.sequenceNumber >> 1) & 1,(rFrame.sequenceNumber >> 0) & 1);
  printf("\n");
  printf("+-+-+-+-+-+-+-+-+");
  printf("\n");
  return 1;
}
