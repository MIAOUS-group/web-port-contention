#include "sendBit.h"
#include "config.h"

#include "p1_time.h"
#include "p1_spam.h"

#include <stdio.h>
#include <stdbool.h>
#include <math.h>
#include <time.h>
#include <unistd.h>

// Physical layer function to send a 1-bit
// Creates contention on port 1 by calling p1_spam.S repeatedly for a given
// time period
int sendOne(long bitDuration, clockid_t clk_id) {
  // We need a  (nano) clock to delimitate the timer period
  struct timespec tp;
  clock_gettime(clk_id, &tp);
  long start_ns = tp.tv_nsec;
  long start_s = tp.tv_sec;

  // Spam for a whole millisecond
  while (((long) (tp.tv_sec - start_s))*1000000000 + (tp.tv_nsec - start_ns) < bitDuration) {
    spam_port1();
    clock_gettime(clk_id, &tp);
  }
  return 1;
}


// Physical layer function to send a 0-bit
// Very complex behaviour: does nothing for a given timer period.
int sendZero(long bitDuration, clockid_t clk_id) {
  struct timespec tp;
  clock_gettime(clk_id, &tp);
  long start_ns = tp.tv_nsec;
  long start_s = tp.tv_sec;
  while (((long) (tp.tv_sec - start_s))*1000000000 + (tp.tv_nsec - start_ns) < bitDuration) {
    clock_gettime(clk_id, &tp);
  }
  return 1;
}



// Sends a bit sequence by using port contention
int sendSequence(long bitDuration, bool* sequence, int sequenceSize) {
  clockid_t clk_id = CLOCK_MONOTONIC;
  struct timespec tp;
  clock_gettime(clk_id, &tp);
  for (int bitIndex = 0; bitIndex < sequenceSize; bitIndex++) {
    if (sequence[bitIndex] == 1) {
      sendOne(bitDuration, clk_id);
    }
    else {
      sendZero(bitDuration,clk_id);
    }
  }
  return 1;
}
