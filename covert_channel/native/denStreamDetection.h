#ifndef DENSTREAMDETECTION_H
#define DENSTREAMDETECTION_H

#include "MicroCluster.h"
#include "DenStream.h"
#include "config.h"

typedef struct {
  int startIndex;
  MicroCluster clusters[MAX_CLUSTER];
  int mcLen;
  int bits[REQUEST_FRAME_SIZE];
  int bitNumber;
  long double threshold;
  double bitSize_0;
  double bitSize_1;
  MicroCluster initSequence[3];
} Results;

int initResults(Results *r);
int printResults(Results *results);
int parseNewPoint(Sample s, DenStream *ds, Results *results);
int getBits(Results *results);
#endif
