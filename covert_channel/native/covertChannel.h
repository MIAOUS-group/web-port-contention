/*!
   \file covertChannel.h
   \brief Main interface for the native part of the covert channel
   \author Thomas Rokicki
   \date 19/11/2021
*/

#ifndef COVERT_CHANNEL_H
#define COVERT_CHANNEL_H
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include "frame.h"
#include <stdatomic.h>
#include "config.h"


/*!
   \struct ThreadRequestInfos
   \brief List of all the threads used to send/receive bits
*/
typedef struct {
  pthread_t threads[PHY_CORE]; // Array of handles to threads
  int threadNumber; // Id of the current thread
  requestFrame rFrame; // Placeholder for the receiverd frame
  atomic_int *finished; // 1 if a thread has received a frame, 0 othrewise
  int code; // Return Code
} ThreadRequestInfos;


#endif
