#ifndef FRAME_H
#define FRAME_H


#include <stdio.h>
#include <stdbool.h>
#include <math.h>

typedef struct {
    unsigned int initSeq;
    unsigned int sequenceNumber;
    char data;
    unsigned int code;
} dataFrame;

typedef struct {
    unsigned int initSeq;
    unsigned int sequenceNumber;
} requestFrame;

int createDataFrame(char data, int sequenceNumber, bool *frame, int frameSize);

dataFrame decodeDataFrame(bool *frame, int frameSize, int* sequenceNumber, char* data);

requestFrame decodeRequestFrame(bool *frame, int frameSize);

int printRequestFrame(bool *frame, int frameSize);
int printRequestFrame_f(requestFrame rFrame);
int printRequestFrame_i(int *frame, int frameSize);

int checkRequestFrame(requestFrame rframe);


#endif
