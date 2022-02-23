#ifndef THRESHOLDDETECTION_H
#define THRESHOLDDETECTION_H

#include "config.h"


#define MAX_TCLUSTER 20
#define JMP_THRESHOLD 1350
#define MIN_SPIKE 2
#define MAX_SPIKE 10


typedef struct {
  int pointCount;
  int bitPosition;
} ThresholdCluster;


typedef struct {
  int threshold;
  int bitCount;
  int initSequenceDetected;
  double bitSize_0;
  double bitSize_1;
  ThresholdCluster clusters[MAX_TCLUSTER];

} ThresholdResults;

int getBitsThreshold(ThresholdResults * tr, int * bits);
int initThresholdDetection(ThresholdResults * tr, int threshold);
int parseNewPointThreshold(int point, ThresholdResults * tr);
int printThresholdDetector(ThresholdResults * tr);
#endif
