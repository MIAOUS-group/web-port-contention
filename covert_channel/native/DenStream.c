/*!
   \file DenStream.c
   Implementation of the DenStream algorithm as defined Feng Cao, Martin
          Estert, Weining Qian, and Aoying Zhou. Density-Based Clustering over
          an Evolving Data Stream with Noise.
          This code is largely based on Denstream Python implementation by  Issa
          Memari available here: https://github.com/issamemari/DenStream
   \author Thomas Rokicki
   \date 19/11/2021
*/

#include "DenStream.h"

#include <math.h>
#include <stdio.h>
#include <float.h>
#include <stdlib.h>


/*!
   \fn int compareCluster ( const void * first, const void * second )
   Compares two clusters based on their x position, used with qsort
   \param[in] first: Pointer to the first cluster of the comparison
   \param[in] first: Pointer to the first cluster of the comparison
   \return Comparison of the two
*/
int compareCluster ( const void * first, const void * second ) {
    MicroCluster fmc = * (const MicroCluster *) first;
    MicroCluster smc = * (const MicroCluster *) second;
    return fmc.center_x - smc.center_x;
}


/*!
   \fn int removeIndex(MicroCluster microClusters[], int mcLen, int index)
   Pop an index from the list of microClusters
   \param[in] microClusters Array of MicroCluster of fixed size.
   \param[in] mcLen Number of MicroClusters in the array.
   \param[in] index Index of the MicroCluster to be removed.

   \return 1 if successful, -1 if index out of range.
*/
int removeIndex(MicroCluster microClusters[], int mcLen, int index){
  if (index < mcLen) { // Check for boundaries
    for (int i = index; i < mcLen; i++) {
      microClusters[i] = microClusters[i+1]; // Shift all the microclusters to the left
    }
    mcLen--; // Update the size
    return 1;
  }
  return -1;
}


/*!
   \fn int initMCArray(MicroCluster mcs[])
   Initiate the array of MC with "fake" mc (x and y to -1)
   \param[out] Pointer where the array of MAX_CLUSTER size will be stored
   \return 1 if okay
*/
int initMCArray(MicroCluster mcs[]) {
  MicroCluster mc;
  mc.center_x = -1;
  mc.center_y = -1;
  for (int i = 0; i < MAX_CLUSTER; i ++) {
    mcs[i] = mc;
  }
  return 1;
}


/*!
   \fn int initDenStream(DenStream *ds, long double lambda, long double eps, long double beta, long double mu)
   Initates the DenStream Detector
   \param[out] ds Pointer to the DenStream object
   \param[in] lambda The forgetting factor. The higher the value, the lower
                     importance of the historical data compared to more recent
                     data.
   \param[in] eps The maximum distance between two samples for them to be
                  considered as in the same neighborhood.
   \param[in] beta The parameter to determine the threshold of outlier relative
                   to c micro clusters
   \param[in] mu The minimal weight to be considered a micro cluster.

   \return 1 if ok
*/
int initDenStream(DenStream *ds, long double lambda, long double eps, long double beta, long double mu) {
  ds->lambda = lambda;
  ds->eps = eps;
  ds->beta = beta;
  ds->mu = mu;
  ds->t = 0.;

  if (ds->lambda > 0.) {
    ds->tp = 5;
  }
  else {
    ds->tp = LDBL_MAX;
  }
  MicroCluster mc;
  mc.center_x = -1.;
  mc.center_y = -1.;

  ds->oLen = 0;
  ds->pLen = 0;
  for (int i = 0; i < MAX_CLUSTER; i++) {
    ds->oMicroClusters[i] = mc;
    ds->pMicroClusters[i] = mc;
  }
  return 1;
}


/*!
   \fn long getNearestMicroCluster(Sample s, MicroCluster clusters[], int mcLen)
    Given a sample (x and y), finds the closest microCluster.
   \param[in] s Sample to integrate to a cluster
   \param[in] clusters Array of all microClusters
   \param[in] mcLen Number of clusters in the array.

   \return Index of the closest mc in the array
*/
long getNearestMicroCluster(Sample s, MicroCluster clusters[], int mcLen) {
  // Standard minimum search, we initiate at max and reduce
  long double smallestDistance = LDBL_MAX;//
  long nearestMicroClusterIndex = -1;
  MicroCluster mc;
  mc.center_x = -1.;
  mc.center_y = -1.;
  long double currentDistance;
  for (long i = 0; i < mcLen; i++) {
     mc = clusters[i];
     // Euclidean distance
     currentDistance = sqrt(powl(mc.center_x - s.x, 2) + powl(mc.center_y - s.y, 2));
     if (currentDistance < smallestDistance) {
       smallestDistance = currentDistance;
       nearestMicroClusterIndex = i;
     }
  }
  return nearestMicroClusterIndex;
}


/*!
   \fn int tryMerge(DenStream *ds, Sample s, MicroCluster mcs[], int mcIndex)
   Check if we can merge a sample in a cluster. If so, merge it.
   \param *ds POinter to the DenStream object
   \param s Sample to merge
   \param mcs[] List of microClusters
   \param mcIndex Index in the list where to try to merge
   \return 1 if we merged, -1 if we cannot
*/
int tryMerge(DenStream *ds, Sample s, MicroCluster mcs[], int mcIndex) {
  if (mcs[mcIndex].center_x != -1.) { // Check if we have a valid mc
    // We work on a copy of the cluster.
    // This way, if we merge and the size of the cluster is to big, we can
    // just rollback by not touching the real mc
    MicroCluster mcCopy;
    copy(&mcs[mcIndex], &mcCopy);
    insertSample(&mcCopy, s);
    if (radius(&mcCopy) < ds->eps) {
      // If the merge is valid, we merge in the REAL mc
      insertSample(&mcs[mcIndex], s);
      return 1;
    }
  }
  return -1;
}


/*!
   \fn int merging(DenStream *ds, Sample s)
   Merges a sample in one of the DenStream clusters by doing the following:
          - If we can fit it in a p-micro cluster, we do so and that's it.
          - If not, we try to fit it in a o-micro-cluster. If so, we check the
            weight of this cluster to see if it does not become a c-micro-
            cluster.
          - If not, we create a new o-micro-cluster with only this sample.
   \param *ds Pointer to the DenStream object
   \param s Sample to merge
   \return 1 if everything went ok
*/
int merging(DenStream *ds, Sample s) {

  // First, try to find the closest p micro cluster
  int nearestPMCIndex = getNearestMicroCluster(s, ds->pMicroClusters, ds->pLen);
  int success = -1;
  if (nearestPMCIndex != -1) { // We have a mc, can we merge it ?
    success = tryMerge(ds, s, ds->pMicroClusters, nearestPMCIndex);
  }
  if (success == -1) { // We couldn't merge it, lets try a o-microcluster
    int nearestOMCIndex = getNearestMicroCluster(s, ds->oMicroClusters, ds->oLen);
    if (nearestOMCIndex != -1) {
      success = tryMerge(ds, s, ds->oMicroClusters, nearestOMCIndex);
    }

    if (success == 1) {
      // We did insert it to a o-micro-cluster!
      // Can we upgrade the o cluster to a c-micro-cluster ?
      if (ds->oMicroClusters[nearestOMCIndex].weight > ds->beta * ds-> mu) {
        ds->pMicroClusters[ds->pLen++] = ds->oMicroClusters[nearestOMCIndex];
        removeIndex(ds->oMicroClusters, ds->oLen--, nearestOMCIndex);
      }
    }

    else {
      // We also failed to insert sample to a o-micro-cluster
      // We create a new o-micro-cluster for this sample.
      MicroCluster mc;
      initMicroCluster(&mc, ds->lambda, ds->t);
      insertSample(&mc, s);
      ds->oMicroClusters[ds->oLen++] = mc;
    }

  }
  return 1;
}


/*!
   \fn long double decayFunction(DenStream *ds, long double t)
   Computes the decay factor based on a given time.
          We use it to lower the weight of old clusters.
   \param *ds Pointer to the DenStream object
   \param t Current time (ie the number of added samples)
   \return Decay Factor
*/
long double decayFunction(DenStream *ds, long double t) {
  return powl(2., (-1. * ds->lambda) * t);
}


/*!
   \fn int partialFit(DenStream *ds, Sample s)
   Merges a sample in a micro cluster, then every tp update clusters to:
            - remove pMicroClusters that have a too small weight
            - Check if oMicroClusters are not too small

   \param *ds Pointer to the DenStream object
   \param s Sample to merge
   \return "Return of the function"
*/
int partialFit(DenStream *ds, Sample s) {
  merging(ds, s);
  if (((unsigned) roundl(ds->t)) % ((unsigned) roundl(ds->tp)) == 0) {
    int i; int count;
    // Update PMCs
    MicroCluster newPMCS[MAX_CLUSTER];
    initMCArray(newPMCS);
    count = 0;
    for (i = 0; i < ds->pLen; i++) {
      if (ds->pMicroClusters[i].weight >= ds->beta * ds->mu) {
        newPMCS[count++] = ds->pMicroClusters[i];
      }
    }
    ds->pLen = count;
    // Update OMCs
    long double Xis[ds->oLen];
    for (i = 0; i < ds->oLen; i++) {
      Xis[i] = (decayFunction(ds, ds->t - ds->oMicroClusters[i].creationTime + ds->tp) - 1) / (decayFunction(ds, ds->tp) - 1);
    }
    MicroCluster newOMCS[MAX_CLUSTER];
    initMCArray(newOMCS);
    count=0;
    for (i = 0; i < ds->oLen; i++) {
      if (ds->oMicroClusters[i].weight >= Xis[i]) {
        newOMCS[count++] = ds->oMicroClusters[i];
      }
    }
    ds->oLen = count;
  }
  ds->t++;
  return 1;
}



int printDenStream(DenStream *ds) {
  printf("-------------------- DenStream --------------------\n");
  printf("Lambda: %Lf \t Eps: %Lf \n", ds->lambda, ds->eps);
  printf("Beta: %Lf \t\t Mu: %Lf \n", ds->beta, ds->mu);
  printf("PMC: %i \t\t\t OMC: %i\n", ds->pLen, ds->oLen);
  printf("\n\n");
  printf("---------------- p micro clusters -----------------\n");
  for (int i = 0; i < ds->pLen; i++) {
    printMicroCluster(&ds->pMicroClusters[i]);
  }
  printf("\n\n");
  printf("---------------- O micro clusters -----------------\n");
  for (int i = 0; i < ds->oLen; i++) {
    printMicroCluster(&ds->oMicroClusters[i]);
  }
  printf("--------------------------------------------------\n");
  printf("\n\n");
  printf("--------------------------------------------------\n");
  return 1;
}
