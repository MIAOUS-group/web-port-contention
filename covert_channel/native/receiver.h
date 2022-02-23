#ifndef RECEIVER_H
#define RECEIVER_H

#define REQUEST_DURATION 20 //seconds
#include <inttypes.h>
#include "frame.h"
#include "denStreamDetection.h"
#include "DenStream.h"
#include "MicroCluster.h"

//


// int computeDifferences(uint64_t *differences, uint64_t *timings, size_t nbTimings);
uint64_t listen();
// void *listenStream(void *vargp);
requestFrame multiListen();
#endif
