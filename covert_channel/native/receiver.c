#define _GNU_SOURCE // for pthreads!

#include "receiver.h"
#include "config.h"
#include "p1_time.h"
#include "utils.h"
// #include "readBits.h"
#include "frame.h"
#include "covertChannel.h"
#include "thresholdDetection.h"

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdbool.h>
#include <math.h>
#include <time.h>
#include <inttypes.h>
#include <assert.h>
#include <stdatomic.h>
#include <pthread.h>


/* Computes the difference between two successive timestamps in an array and
returns it in the array given in parameter.
*/
int computeDifferences(uint64_t *differences, uint64_t *timings, size_t nbTimings){
  for (int i = 0; i < nbTimings - 1; i++) {
    differences[i] = timings[i+1] - timings[i];
  }
  return 0;
}

uint64_t average(uint64_t *differences, size_t nbTimings) {
  uint64_t sum = 0;
  for (size_t i = 0; i < nbTimings -1 ; i++) {
    sum += differences[i];
  }
  return (sum/ nbTimings -1);
}


unsigned int median(unsigned int *values, size_t valueNumber) {
  //Qsort needs a comparison function, it is in utils.c
  qsort(values, valueNumber, sizeof(unsigned int), comp);
  return values[valueNumber / 2];
}


/**
* Repeatedly calls p1_time.S, timing access of repeated calls to crc32,
* measuring contention on port 1.
*
* We return the average of the RECEIVER REP measurements
*
**/
uint64_t listen() {
  size_t nbTimings = RECEIVER_REP; // defined in config.h

  // Arrays
  uint64_t *timings = (uint64_t *)calloc(nbTimings, sizeof(uint64_t));
  uint64_t *differences = (uint64_t *)calloc(nbTimings - 1, sizeof(uint64_t));
  assert(timings != NULL);
  assert(differences != NULL);

  // Measuring
  read_timings(timings);
  computeDifferences(differences, timings, nbTimings);
  free(timings);
  uint64_t timingAverage = average(differences, nbTimings);
  free(differences);
  return timingAverage;
}


// Main receiver function, it uses each measurement as a new data point to feed
// the stream algorithm.
// It is made to be used with pthread, hence the void pointer arguments.
// It will measure contention until it receives a frame or timeouts.
// It will modify the ThreadRequestInfos object with the frame if it received one.
// As it is used in multithreading, only one thread receives the answer.
// If that happens, a atomic int is set to one and break the loops of other threads.
void* listenStream(void *vargp) {
  // Important object, sharing information between threads.
  ThreadRequestInfos *infos = (ThreadRequestInfos *)vargp;

  // Here we use Threshold based detection as our stream algorithm
  ThresholdResults tr;
  initThresholdDetection(&tr, JMP_THRESHOLD);

  // To reduce noise, we smoothen the results with a median sliding window.
  size_t medianSize = 10;
  unsigned int timingTmp[medianSize];

  // We need a clock to measure the timeouts.
  clockid_t clk_id = CLOCK_MONOTONIC;
  struct timespec tp;
  clock_gettime(clk_id, &tp);
  long start_ns = tp.tv_nsec;
  long start_s = tp.tv_sec;

  // Data to store the results, not necessary but useful for debug
  size_t index = 0;
  unsigned int timing = 0;
  unsigned int timings[1000000];


  while ((((long) (tp.tv_sec - start_s))*1000000000 + (tp.tv_nsec - start_ns) < REQUEST_TIMEOUT) // Timeout condition
        & (tr.bitCount < REQUEST_FRAME_SIZE) // We received enough information to create a frame, we may stop listening
        & (*infos->finished == 0)) // Another thread has received a frame, stop condition.
  {

    // Median loop !
    for (size_t i = 0; i <medianSize; i++) {
      timing = (unsigned int) (listen() / 1000000000);
      timingTmp[i] = timing;
    }
    int point = median(timingTmp, medianSize);

    // Feed the median to the stream algorithm
    parseNewPointThreshold(point, &tr);

    if (DEBUG) timings[++index] = point;

    //Update clock for tiemout
    clock_gettime(clk_id, &tp);
  }


  // This means that this is the first thread to receive a full frame
  if (*infos-> finished ==0) {
    *infos->finished = 1; // Stop the other frames

    // Write results to a file to allow plots
    if (DEBUG) {
      printThresholdDetector(&tr);
      char file_title[100];
      sprintf(file_title, "./data_%i", rand()%100);
      FILE *fp;
      fp = fopen(file_title, "w+");
      for (int w = 0; w < index; w++) {
        fprintf(fp, "%i\t", timings[w]);
      }
      fclose(fp);
    }

    // Parses timings to bits
    int bits[REQUEST_FRAME_SIZE];
    getBitsThreshold(&tr, bits);


    bool bits_b[REQUEST_FRAME_SIZE];
    for (int i = 0; i < REQUEST_FRAME_SIZE; i++) {
      if (DEBUG) printf("%i",bits[i]);
      bits_b[i] = bits[i];
    }
    if (DEBUG) printf("\n");

    // Set the frame in the ThreadRequestInfos object!
    infos->rFrame = decodeRequestFrame(bits_b, REQUEST_FRAME_SIZE);

    return NULL;
  }
  else {
    return NULL;
  }
}



// Handles multithreading of the listener.
// Basically creates a thread on each physical core and makes it listening to
// the cover channel.
// Waits for all of them to finishe
// Checks the validity of the (potential) received frame.
requestFrame multiListen() {
  cpu_set_t cpuset;

  pthread_t threads[PHY_CORE];
  ThreadRequestInfos infos;
  atomic_int finished = 0;
  for (int j = 0; j < PHY_CORE; j++) {
    infos.threads[j] = threads[j];
  }
  infos.finished = &finished;
  for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
    pthread_create(&threads[threadNumber], NULL, listenStream, (void *)&infos);
    CPU_ZERO(&cpuset);
    CPU_SET(threadNumber, &cpuset);
    pthread_setaffinity_np(threads[threadNumber], sizeof(cpuset), &cpuset);
  }
  for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
    pthread_join(threads[threadNumber], NULL);
  }


  if(checkRequestFrame(infos.rFrame)){
    infos.code = VALID_ANSWER;
    return infos.rFrame;
  }
  else {
    infos.code = INVALID_FRAME;
    requestFrame rFrame;
    rFrame.initSeq = 0; // invalid frame
    return rFrame;
  }
}
