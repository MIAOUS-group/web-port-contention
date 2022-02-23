#ifndef MICROCLUSTER_H
#define MICROCLUSTER_H




typedef struct {
  long double center_x;
  long double center_y;
  unsigned pointNumber;
  long double lambda;
  long double decayFactor;
  long double variance_x;
  long double variance_y;
  long double weight;
  long double creationTime;
} MicroCluster;

typedef struct {
  long double x;
  long double y;
} Sample;


int initMicroCluster(MicroCluster *mc, long double lambda, unsigned creationTime);
int printMicroCluster(MicroCluster *mc);
int insertSample(MicroCluster *mc, Sample s);
long double radius(MicroCluster *mc);
int copy(MicroCluster *mc, MicroCluster *mcCopy);

#endif
