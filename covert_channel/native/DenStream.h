/*!
   \file DenStream.h
   \brief Header of the DenStream algorithm as defined Feng Cao, Martin
          Estert, Weining Qian, and Aoying Zhou. Density-Based Clustering over
          an Evolving Data Stream with Noise.
          This code is largely based on Denstream Python implementation by  Issa
          Memari available here: https://github.com/issamemari/DenStream
   \author Thomas Rokicki
   \date 19/11/2021
*/


#ifndef DENSTREAM_H
#define DENSTREAM_H

#include "MicroCluster.h"

/*!< Max number of clusters in the array - bad practice :() */
#define MAX_CLUSTER 1000


/*!
   \struct DenStream
   \brief Object representing the DenStream algorithm, storing clusters and such
*/
typedef struct {
  //The forgetting factor. The higher the value, the
  //lower importance of the historical data compared to more recent data.
  long double lambda;

  // The maximum distance between two samples for them to be considered as in
  // the same neighborhood.
  long double eps;

  // The parameter to determine the threshold of outlier relative to c micro
  //  clusters
  long double beta;

  // The minimal weight to be considered a micro cluster.
  long double mu;

  long double t; // Current time

  //tp represents the time period where we check and update our clusters.
  long double tp;

  MicroCluster oMicroClusters[MAX_CLUSTER]; // Array of omc
  int oLen; // Number of omc
  MicroCluster pMicroClusters[MAX_CLUSTER]; // Array of pmc
  int pLen; // Number of pmc

} DenStream;



/*!
   \fn int initMCArray(MicroCluster mcs[])
   \brief Initiate the array of MC with "fake" mc (x and y to -1)
   \param[out] Pointer where the array of MAX_CLUSTER size will be stored
   \return 1 if okay
*/
int initMCArray(MicroCluster mcs[]);



/*!
   \brief Compares two clusters based on their x position, used with qsort
   \param[in] first: Pointer to the first cluster of the comparison
   \param[in] first: Pointer to the first cluster of the comparison
   \return Comparison of the two
*/
int compareCluster ( const void * first, const void * second );



/*!
   \fn int initDenStream(DenStream *ds, long double lambda, long double eps, long double beta, long double mu)
   \brief Initates the DenStream Detector
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
int initDenStream(DenStream *ds, long double lambda, long double eps, long double beta, long double mu);



/*!
   \fn int partialFit(DenStream *ds, Sample s)
   \brief Merges a sample in a micro cluster, then every tp update clusters to:
            - remove pMicroClusters that have a too small weight
            - Check if oMicroClusters are not too small

   \param *ds Pointer to the DenStream object
   \param s Sample to merge
   \return "Return of the function"
*/
int partialFit(DenStream *ds, Sample s);




int printDenStream(DenStream *ds);
#endif
