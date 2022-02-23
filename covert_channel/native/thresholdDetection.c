/**
* File thresholdDetection.c - Main implementation of a stream based algorithm
* to detect incoming frames.
*
* The principle is simple: the detector distinguish 0 and 1 bits with a temporal
* threshold: any value above are computed as 1 and lower as 0.
* This let us detect change of bits, we just have to get the number of bits in
* this sequence.
*
* It is way faster than DenStream, allowing to lower the resolution without losing
* bits. However, it recquires to hardcode some values that can depend on the system.
*
* The ThresholdResults struct represents the state of the detector at a given time.
*
*
*
**/


#include "thresholdDetection.h"

#include <stdio.h>
#include <stdlib.h>
#include <math.h>


// Initiate the main object.
// We use hardcoded value, we may also initialize it with Denstream values
int initThresholdDetection(ThresholdResults * tr, int threshold) {
  tr->threshold = threshold;
  tr->bitCount = 0;
  tr->initSequenceDetected = 0;
  tr->bitSize_0 = 5.;
  tr->bitSize_1 = 4.;

  for (int i = 0; i < MAX_TCLUSTER; i++) {
    ThresholdCluster tc = {0,-1};
    tr->clusters[i] = tc;
  }

  return 0;
}

// Given a point, returns if it is a 0bit or a 1bit by comparing it to the threshold
int getBitPositionThreshold(int point, ThresholdResults * tr) {
  return (point > tr->threshold);
}



// Returns the number of bits inside of a bitsequence.
// To do so, we use the number of points of the cluster and divide it by the
// average number of bits in this bit position.
int getBitCountThreshold(ThresholdCluster * tc, ThresholdResults * tr) {
  double bitSize;
  // The bitsize varies between 0 and 1
  if (tc->bitPosition == 0) bitSize = tr->bitSize_0;
  else bitSize = tr->bitSize_1;

  //Euclidean division
  int bitCount = (unsigned) roundl((double) tc->pointCount / bitSize);
  return bitCount;
}


// Parses all the clusters inside of the result object and count the number of
// bits already detected
int getTotalBitCountThreshold(ThresholdResults * tr) {
  if (tr->initSequenceDetected) {
    int bitCount = 0;
    for (int i = 0; i < MAX_TCLUSTER; i++) {
      if (tr->clusters[i].bitPosition != -1) {
        bitCount += getBitCountThreshold(&(tr->clusters[i]), tr);
      }
    }
    tr->bitCount = bitCount;
  }
  return 0;
}



// Count the number of clusters inside of the cluster list.
// I can't use proper memory
int getClusterCount(ThresholdResults * tr) {
  int clusterCount;
  for (clusterCount = 0; clusterCount < MAX_TCLUSTER; clusterCount++) {
    if (tr->clusters[clusterCount].bitPosition == -1) break;
  }
  return clusterCount;
}


// Checks whether we have detected the initalization sequence or not.
// We only use the 3 first bits (101) of the init sequence as the last cluster
// may not be a single bit (for instance in the message 101000 this would mess
// calibration.)
int detectInitSequenceThreshold(ThresholdResults * tr) {
  if ((tr->clusters[0].bitPosition != -1) & (tr->clusters[1].bitPosition != -1) & (tr->clusters[2].bitPosition != -1)) { // We have 3 clusters
    if ((tr->clusters[0].bitPosition == 1) & (tr->clusters[1].bitPosition == 0) & (tr->clusters[2].bitPosition == 1)) { // Proper init sequence 101
      if ((tr->clusters[0].pointCount > MIN_SPIKE) & (tr->clusters[1].pointCount > MIN_SPIKE) & (tr->clusters[2].pointCount > MIN_SPIKE) // No spikes
         & (tr->clusters[0].pointCount < MAX_SPIKE) & (tr->clusters[1].pointCount < MAX_SPIKE) & (tr->clusters[2].pointCount < MAX_SPIKE)) // No too long clusters
      {
        tr->initSequenceDetected = 1; // Change the flag
        return 1;
      }
    }
  }
  return 0;
}


// Remove small clusters (spike like) by merging them.
int smoothen(ThresholdResults * tr) {
  int clusterCount = getClusterCount(tr);
  if (clusterCount > 2) {
    if (tr->clusters[clusterCount - 2].pointCount < MIN_SPIKE) {
      tr->clusters[clusterCount - 3].pointCount += tr->clusters[clusterCount - 2].pointCount;
      tr->clusters[clusterCount - 3].pointCount += tr->clusters[clusterCount - 1].pointCount;
      ThresholdCluster c1 = {0, -1};
      ThresholdCluster c2 = {0, -1};
      tr->clusters[clusterCount -2] = c1;
      tr->clusters[clusterCount - 1] = c2;
    }
  }
  return 0;
}


// Parses all of the bits in the cluster list.
// Used at the end, it corresponds to the frame.
int getBitsThreshold(ThresholdResults * tr, int * bits) {
  int bitCount = 0;
  for (int i = 0; i < MAX_TCLUSTER; i++) {
    if (tr->clusters[i].bitPosition !=-1){

      for (int j = 0; j < getBitCountThreshold(&(tr->clusters[i]), tr); j ++) {
        bits[bitCount++] = tr->clusters[i].bitPosition;
        if (bitCount == REQUEST_FRAME_SIZE) {
          break;
        }
      }
    }
  }
  return 0;
}


// Main function of the detector, this is used for each new time measurement.
int parseNewPointThreshold(int point, ThresholdResults * tr) {
  int clusterCount = getClusterCount(tr);

  // First case, the point is in the same cluster than before
  if (getBitPositionThreshold(point, tr) == tr->clusters[clusterCount-1].bitPosition) {
    tr->clusters[clusterCount - 1].pointCount++;
    if (tr->initSequenceDetected) smoothen(tr); // We remove spikes
    if (tr->clusters[clusterCount -1].pointCount % 10 == 0) getTotalBitCountThreshold(tr); // We still check if we have enough bits to stop listening
  }
  // Else we may have a new cluster!
  else {
    if (!tr->initSequenceDetected){ // Check if we have a new init sequence
      ThresholdCluster c = {1, getBitPositionThreshold(point, tr)};
      tr->clusters[clusterCount] = c;
      tr->clusters[0] = tr->clusters[1];
      tr->clusters[1] = tr->clusters[2];
      tr->clusters[2] = tr->clusters[3];

      tr->clusters[3] = c;
      ThresholdCluster c2 = {0,-1};
      tr->clusters[4] =c2;
      detectInitSequenceThreshold(tr);
    }
    else {// Simply add the new threshold
      getTotalBitCountThreshold(tr);
      ThresholdCluster c = {1, getBitPositionThreshold(point, tr)};
      tr->clusters[clusterCount] = c;
    }
  }
  return 0;
}





int printThresholdDetector(ThresholdResults * tr) {
  int str_size = 10000;
  char *str = malloc((str_size)*sizeof(char));
  char *ptr = str;
  ptr += sprintf(ptr, "------------------------------ Threshold  Results ------------------------------\n");
  ptr += sprintf(ptr, "Threshold: %i \t\t Min Spike: %i \t\t Max Spike: %i \n", JMP_THRESHOLD, MIN_SPIKE, MAX_SPIKE);
  ptr += sprintf(ptr, "Bit Size 0: %lf \t Bit Size 1: %lf \t Bit Count: %i \t InitSequence: %i\n", tr->bitSize_0, tr->bitSize_1, tr->bitCount, tr->initSequenceDetected);
  for (int i = 0; i < MAX_TCLUSTER; i++) {
    if (tr->clusters[i].bitPosition !=-1)
    ptr += sprintf(ptr, "Bit Position: %i \t\t\t\t\t Point Count: %i\n", tr->clusters[i].bitPosition, tr->clusters[i].pointCount);
  }
  ptr += sprintf(ptr, "\n\n\n\n");
  printf("%s", str);
  free(str);
  return 0;
}
