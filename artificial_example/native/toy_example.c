#define _GNU_SOURCE

#include "toy_example.h"
#include "p1_spam.h"
#include "p5_spam.h"


#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <unistd.h>


void *spamPort1Wrapper(void *vargp) {
  // sleep(1);
  spam_port1();
  spam_port1();
  spam_port5();
  spam_port1();
  spam_port5();
  spam_port5();
  spam_port1();

  return NULL;
}

void *spamPort5Wrapper(void *vargp) {
  // sleep(1);
  spam_port5();
  return NULL;
}

int toyExample(int bit) {
  // while(1) {spam_port1();}
  if (bit == 0) {
    cpu_set_t cpuset;
    pthread_t threads[PHY_CORE];

    for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
      pthread_create(&threads[threadNumber], NULL, spamPort1Wrapper, NULL);
      CPU_ZERO(&cpuset);
      CPU_SET(threadNumber, &cpuset);
      pthread_setaffinity_np(threads[threadNumber], sizeof(cpuset), &cpuset);
    }
    for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
      pthread_join(threads[threadNumber], NULL);
    }
  }
  else if (bit == 1) {
    cpu_set_t cpuset;
    pthread_t threads[PHY_CORE];
    for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
      pthread_create(&threads[threadNumber], NULL, spamPort5Wrapper, NULL);
      CPU_ZERO(&cpuset);
      CPU_SET(threadNumber, &cpuset);
      pthread_setaffinity_np(threads[threadNumber], sizeof(cpuset), &cpuset);
    }
    for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
      pthread_join(threads[threadNumber], NULL);
    }
  }
  else {
    printf("Invalid parameter %i, please enter 0 or 1\n", bit);
    return 1;
  }
  return 0;
}

int main(int argc, char *argv[]){
  if (argc >= 2) {
    int bit = atoi(argv[1]);
    if ((bit == 0) | (bit == 1)) {
      toyExample(bit);
    }
    else {
      printf("Invalid parameter %i, please enter 0 or 1\n", bit);
    }
  }
  else {
    printf("Please enter a bit value, either 0 or 1\n");
  }
  return(0);
}
