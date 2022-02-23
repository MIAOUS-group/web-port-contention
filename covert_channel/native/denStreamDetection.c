/*!
   \file denStreamDetection.c
   \brief Implementation of a detector based on denstream
   \author Thomas Rokicki
   \date 19/11/2021
*/
#include "denStreamDetection.h"

#include <stdio.h>
#include <stdlib.h>
#include <math.h>

/**                                  Utils                                   **/


/*!
   \fn int getBitPosition(MicroCluster mc, long double threshold)
   \brief Determines if a given cluster represent 1 or 0  value bits
   \param mc cluster
   \param threshold  Average value between timings of 1 and 0 bits.
   \return The bit value of the cluster (1 or 0).
*/
int getBitPosition(MicroCluster mc, long double threshold) {
  return mc.center_y > threshold;
}


/*!
   \fn unsigned getBitNumber(MicroCluster mc, Results r)
   \brief Returns the number of bit a micro cluster holds.
          This is because we only detect jumps, but we don't know the number of
          bits between these jumps:
          it could be 101 or 10000000000000000000000000000001
   \param mc cluster
   \param r Set of params and results
   \return The number of bits held in the cluster.
*/
unsigned getBitNumber(MicroCluster mc, Results r) {
  int bitPosition = getBitPosition(mc, r.threshold);
  unsigned bitNumber;
  /**
   * To do stuff properly, we need to know the bit position of the cluster.
   * That is because 0-bits (no port contention) and 1-bits (port contention)
   * have different execution time.
   * But the real, temporal, duration of a bit, as sent by the web receiver, is
   * constant. This means that, for a certain bit, the number of experiment
   * differ.
   * Since we use that number of points/experiments to distinguish the bit number,
   * we need to differentiate 1s and 0s.
  **/
  if (bitPosition == 1) {
    bitNumber =(unsigned) roundl(((long double) mc.pointNumber) / ((long double) r.bitSize_1));
  }
  else {
    bitNumber =(unsigned) roundl(((long double) mc.pointNumber) / ((long double) r.bitSize_0));
  }
  return bitNumber;
}


/*!
   \brief Init the results object - our main tool to keep track of the detecotr
   \param *r pointer to the results object
*/
int initResults(Results *r) {
  r->startIndex = -1;
  r->bitNumber = 0;
  r->threshold = 0.;
  r->bitSize_0 = -1;
  r->bitSize_1 = -1;


  initMCArray(r->clusters);
  for (int i = 0; i < REQUEST_FRAME_SIZE; i++) {
    r->bits[i] = -1;
  }
  r->mcLen = 0;
  MicroCluster mc;
  mc.center_x = -1.;
  mc.center_y = -1;
  for (int i = 0; i < 3; i++) {
    r->initSequence[i] = mc;
  }

  return 1;
}



int printResults(Results *results) {
  printf("-------------------- Results ---------------------\n");
  printf("Start Index: %i,\t threshold: %Lf\n", results->startIndex, results->threshold);
  printf("Bit Size 0: %lf,\t Bit size 1: %lf\n", results->bitSize_0, results->bitSize_1);
  printf("\n");

  printf("------------------ initSequence  -----------------\n");
  for (int i = 0; i < 3; i++) {
    printMicroCluster(&results->initSequence[i]);
  }
  printf("--------------------------------------------------\n");
  printf("\n");
  printf("\n");

  printf("Bit count: %i,\t Cluster number: %i\n",results->bitNumber, results->mcLen);
  printf("------------------- Clusters  --------------------\n");
  for (int i = 0; i < results->mcLen; i++) {
    printMicroCluster(&results->clusters[i]);
  }
  printf("--------------------------------------------------\n");
  printf("Bits: ");
  for (int i = 0; i < REQUEST_FRAME_SIZE; i ++) {
    printf("%i", results->bits[i]);
  }
  printf("\n--------------------------------------------------\n");
  return 1;
}



/**                 Initialization sequence and calibration                  **/



/*!
   \fn int calibrate(Results *r)
   \brief Use the initalization sequence to get useful information, such
          as bitSize (the average number of point in a single bit) and threshold (
          to distinguish 1s from 0s)
          Note that we only work with the first 3 bits of the initalization sequence.
          That is because, although we know the 4 bits of the initalization sequence,
          (1010), we don't know if the next one will be (10101) or (10100), so we cannot
          use the 4th cluster to determine the bitsize.
          This function returns nothing but directly updates the result object


   \param Pointer to our result object
*/
int calibrate(Results *r) {
  r->threshold = (r->initSequence[0].center_y + 2*r->initSequence[1].center_y + r->initSequence[2].center_y)/4.;
  r->bitSize_0 = r->initSequence[1].pointNumber;
  r->bitSize_1 = (r->initSequence[0].pointNumber + r->initSequence[2].pointNumber)/2. * 1.1;
  return 1;
}


/*!
   \fn int checkInitSequenceStream(MicroCluster clusters[], Results *results, DenStream *ds, long double threshold)
   \brief Checks the initsequence part of the result object if it contais a 101,
          it considers it the real init sequence, and We use an arbitrary
          threshold ratio to distinguish 1 from 0 here, its bad practice
          This function returns nothing but directly updates the result object
*/
int checkInitSequenceStream(MicroCluster clusters[], Results *results, DenStream *ds, long double threshold) {
  if ((results->initSequence[0].center_x != -1) & (results->initSequence[1].center_x != -1) &(results->initSequence[2].center_x != -1)) {
    if ((results->initSequence[0].center_y > threshold * results->initSequence[1].center_y) & (results->initSequence[2].center_y > threshold * results->initSequence[1].center_y)) {
      results->startIndex = ds->pLen - 5;
      calibrate(results);
      results ->bitNumber = 3;
      for (int i = 0; i < 3; i++) {
        results->clusters[i] = results->initSequence[i];
        results->mcLen++;
      }
    }
  }
  return 1;
}



/**                         Merging and update function                      **/



int mergeClusters(MicroCluster cluster1, MicroCluster cluster2, MicroCluster *newMC) {
  initMicroCluster(newMC, (cluster1.lambda + cluster2.lambda) / 2., cluster1.creationTime);
  newMC->weight = cluster1.weight + cluster2.weight;
  newMC->pointNumber = cluster1.pointNumber + cluster2.pointNumber;
  newMC->center_x = (cluster1.center_x + cluster2.center_x)/2.;
  newMC->center_y = (cluster1.center_y + cluster2.center_y)/2.;
  return 1;
}



int updateClusterList(Results *results, MicroCluster newCluster, long double epsilon) {
  if ((results->mcLen > 0) & (results->startIndex != -1)) {
    int oldBitPosition = getBitPosition(results->clusters[results->mcLen -1 ], results->threshold);
    int newBitPosition = getBitPosition(newCluster, results->threshold);
    if ((results->clusters[results->mcLen - 1].center_x != newCluster.center_x)) {
      if (oldBitPosition == newBitPosition) {
        int oldBitNumber = getBitNumber(results->clusters[results->mcLen - 1], *results);
        results->bitNumber -= oldBitNumber;

        MicroCluster mergedMC;
        mergeClusters(results->clusters[results->mcLen - 1 ], newCluster, &mergedMC);
        results->clusters[results->mcLen - 1] = mergedMC;
        int newBitNumber = getBitNumber(results->clusters[results->mcLen - 1], *results);
        results->bitNumber += newBitNumber;
      }
      else {
        results->clusters[results->mcLen++] = newCluster;
        results->bitNumber += getBitNumber(newCluster, *results);
      }
    }
    calibrate(results);
  }
  else if ((results->startIndex == -1) & (results->initSequence[0].center_x!=-1) & (results->initSequence[1].center_x!=-1) & (results->initSequence[2].center_x!=-1)) {
    if (newCluster.center_x != results->initSequence[2].center_x) {
      if ((newCluster.center_y < results->initSequence[2].center_y * epsilon) & (newCluster.center_y > results->initSequence[2].center_y / epsilon)) {
        MicroCluster mergedMC;
        mergeClusters(results->initSequence[2], newCluster, &mergedMC);
      }
      else {
        results->initSequence[0] = results->initSequence[1];
        results->initSequence[1] = results->initSequence[2];
        results->initSequence[2] = newCluster;
      }
    }
  }
  else {
    if (results->initSequence[0].center_x == -1) {
      results->initSequence[0]=newCluster;
    }
    else if (results->initSequence[1].center_x ==-1) {
      results->initSequence[1]=newCluster;
    }
    else {
      results->initSequence[2]=newCluster;
    }
  }
  return 1;
}



int parseNewCluster(MicroCluster clusters[], Results *results, DenStream *ds) {
  if (ds->pLen > 3) {
    updateClusterList(results, clusters[ds->pLen - 3], 1.05);
    if (results->startIndex == -1) {
      checkInitSequenceStream(clusters, results, ds, 1.15);
    }
  }
  return 1;
}



int parseNewPoint(Sample s, DenStream *ds, Results *results) {
  int oldClusterCount = ds->pLen;
  partialFit(ds, s);
  int newClusterCount = ds->pLen;
  if (oldClusterCount != newClusterCount) {
    qsort( ds->pMicroClusters, ds->pLen, sizeof(MicroCluster), compareCluster );
    parseNewCluster(ds->pMicroClusters, results, ds);
  }
  return 1;
}



int getBits(Results *results) {
  int bitCount = 0;
  for (int i = 0; i < results->mcLen; i++) {
    int bitPosition = getBitPosition(results->clusters[i], results->threshold);
    int bitNumber = getBitNumber(results->clusters[i], *results);
    for (int j = 0; j < bitNumber; j++){
      results->bits[bitCount] = bitPosition;
      bitCount++;
      if (bitCount>=REQUEST_FRAME_SIZE) {
        break;
      }
    }
  }
  return 1;
}
