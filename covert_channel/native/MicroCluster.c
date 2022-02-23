#include "MicroCluster.h"
#include "config.h"


#include <stdio.h>
#include <math.h>



int initMicroCluster(MicroCluster *mc, long double lambda, unsigned creationTime) {
  mc->lambda = lambda;
  mc->decayFactor = powl(2., -1. * lambda);

  mc->creationTime = creationTime;

  mc->pointNumber = 0;
  mc->weight = 0.;

  mc->center_x = 0.;
  mc->center_y = 0.;

  mc->variance_x = 0.;
  mc->variance_y = 0.;

  return 1;
}



int insertSample(MicroCluster *mc, Sample s) {
  if (mc->weight > 0.) {
    long double weight = 1.;

    long double oldWeight = mc->weight;
    long double newWeight = oldWeight * mc->decayFactor + weight;
    mc->weight = newWeight;

    long double oldCenter_x = mc->center_x;
    long double newCenter_x = oldCenter_x + ((weight / newWeight) * ( s.x - oldCenter_x));
    mc->center_x = newCenter_x;

    long double oldCenter_y = mc->center_y;
    long double newCenter_y = oldCenter_y + ((weight / newWeight) * ( s.y - oldCenter_y));
    mc->center_y = newCenter_y;

    long double oldVariance_x = mc->variance_x;
    long double newVariance_x = (oldVariance_x * ((newWeight - weight) / oldWeight)) + (weight * (s.x - newCenter_x) * (s.x - oldCenter_x));
    mc->variance_x = newVariance_x;

    long double oldVariance_y = mc->variance_y;
    long double newVariance_y = (oldVariance_y * ((newWeight - weight) / oldWeight)) + (weight * (s.y - newCenter_y) * (s.y - oldCenter_y));
    mc->variance_y = newVariance_y;

    mc->pointNumber++;
    return 1;

  }
  else {
    mc->center_x = s.x;
    mc->center_y = s.y;

    mc->weight = 1;
    mc->pointNumber++;

    return 1;
  }
}



long double radius(MicroCluster *mc) {
  if (mc->weight > 0.) {
    long double radius_x, radius_y;


    radius_x = sqrtl(mc->variance_x / mc->weight);
    radius_y = sqrtl(mc->variance_y / mc->weight);

    return sqrtl(powl(radius_x, 2) + powl(radius_y,2));

  }
  else {
    return -1.;
  }
}



int copy(MicroCluster *mc, MicroCluster *mcCopy) {
  initMicroCluster(mcCopy, mc->lambda, mc->creationTime);

  mcCopy->center_x = mc->center_x;
  mcCopy->center_y = mc->center_y;

  mcCopy->variance_x = mc->variance_x;
  mcCopy->variance_y = mc->variance_y;

  mcCopy->weight = mc->weight;
  mcCopy->pointNumber = mc->pointNumber;

  return 1;
}



int printMicroCluster(MicroCluster *mc) {
  printf("--------------------------------------------------\n");
  printf("Center: %Lf \t %Lf \n", mc->center_x,mc->center_y);
  printf("Point Number: %u \t Weight: %Lf\n", mc->pointNumber, mc->weight);
  printf("--------------------------------------------------\n");

  return 1;
}
