/**
* This is the class implementation of the DenStream algorithm, presented in the
* following paper:
* Feng Cao, Martin Estert, Weining Qian, and Aoying Zhou. Density-Based
* Clustering over an Evolving Data Stream with Noise.
*
*
* This code is largely based on Denstream Python implementation by  Issa Memari
* available here: https://github.com/issamemari/DenStream
 */


/**
 * Main class of the denstream algorithm.
 * It represents the main clusterer, containing all micro clusters and updating
 * them in real time.
 */
class DenStream {


  /**
   * constructor - Create a clusterer
   *
   * @param  {Number} lambda=1 The forgetting factor. The higher the value, the
   * lower importance of the historical data compared to more recent data.
   * @param  {Number} eps=1    The maximum distance between two samples for them
   * to be considered as in the same neighborhood.
   * @param  {Number} beta=2   The parameter to determine the threshold of
   * outlier relative to c micro clusters
   * @param  {Number} mu=2     The minimal weight to be considered a micro
   * cluster.
   */
  constructor(lambda=1, eps=1, beta=2, mu=2) {
    this.pMicroClusters = [];
    this.oMicroClusters = [];
    this.lambda = lambda;
    this.eps = eps;
    this.beta = beta;
    this.mu = mu;
    this.t = 0; // keeps track of the current time. We don't use real time but
    // we increment it with each point
    this.pMicroClusters = [];
    this.oMicroClusters = [];
    if (this.lambda > 0) {
      this.tp = math.ceil( (1 / lambda) * math.log( (beta * mu) / (beta*mu -1) ) );
      //tp represents the time period where we check and update our clusters.
    }
    else{
      this.tp = Number.MAX_SAFE_INTEGER;
    }
  }



  /**
   * partialFit - The online learning phase. We fit the points given in param
   * and update our clusters accordingly.
   * For each point, we first try to fit it in a c-micro-cluster.
   * If we cannot (because its too far), we try to fit it in a o-micro-cluster.
   * If we still can't, we create a new o-micro-cluster.
   *
   * Every this.tp points, we check all clusters to see if:
   *  - c micro clusters have a low weight, they disappear
   *  - o micro clusters have a high weight, we upgrade them to c micro clusters
   *
   * @param  {Array[Array[Number]]} X Our data has a two dimensional array.
   * This function can fit several different values (each subarray is a value)
   * @param  {type} sampleWeight=null Weight of the data
   */
  partialFit(X, sampleWeight=null) {
    var numberSamples = X.length;

    // We check (or initialize since its optionnal ) our weight array
    sampleWeight = this.#validateSampleWeight(sampleWeight, numberSamples);

    for (var sampleIndex = 0; sampleIndex < numberSamples; sampleIndex++) {
      this.#partialFit(X[sampleIndex], sampleWeight[sampleIndex]);
    }
  }



  /**
   * getNearestMicroCluster - For a given sample, we try to find the closest
   * micro cluster. This function is the same for o micro clusters and c micro
   * clusters
   *
   * @param  {Array[Number]} sample Value to fit
   * @param  {Array[MicroCluster]} microClusters The list of micro clusters
   * where we search. Typically this.oMicroClusters or this.pMicroClusters
   * @return {Number} An object, containing the index of the nearest micro
   * cluster (or -1 if none is found), as well as said micro cluster (or null if
   * none is found).
   */
  #getNearestMicroCluster(sample, microClusters){
    var smallestDistance = Number.MAX_SAFE_INTEGER;
    var nearestMicroCluster = null;
    var nearestMicroClusterIndex = -1;

    for (var i = 0; i < microClusters.length; i ++) {
      var microCluster = microClusters[i];
      var currentDistance = math.norm(bitWiseDifference(microCluster.center, sample));
      if (currentDistance < smallestDistance) {
        smallestDistance = currentDistance;
        nearestMicroCluster = microCluster;
        nearestMicroClusterIndex = i;
      }
    }
    return {nearestMicroClusterIndex: nearestMicroClusterIndex, nearestMicroCluster: nearestMicroCluster}
  }



  /**
   * tryMerge - Checks if we can merge a sample to a certain cluster.
   * We can if the radius of the output cluster has a radius smaller than the
   * epsilon parameter.
   *
   * If we can insert it, the function returns it.
   *
   * @param  {Array[Number]} sample       The sample to try to insert
   * @param  {Number} weight       Weight of the sample
   * @param  {MicroCluster} microCluster The micro cluster to try to update
   * @return {Boolen}              true if we inserted the sample, false otherwise
   */
  #tryMerge(sample, weight, microCluster){
    if (microCluster != null) {

      // We create a copy to check if we can insert the sample to the cluster.
      // It is because it is easy to add a sample to a cluster but hard to
      // remove it.
      // This way if we can't insert it, no harm is done to the real cluster.
      var microClusterCopy = microCluster.copy();
      microClusterCopy.insertSample(sample, weight);
      if (microClusterCopy.radius() < this.eps) { // Check if we can insert it
        microCluster.insertSample(sample, weight);
        return true
      }
    }
    return false
  }



  /**
   * merging - Parse a sample, by doing the following:
   *  - If we can fit it in a c-micro cluster, we do so and that's it.
   *  - If not, we try to fit it in a o-micro-cluster. If so, we check the
   * weight of this cluster to see if it does not become a c-micro-cluster.
   *  - If not, we create a new o-micro-cluster with only this sample.
   *
   *
   * @param  {Array[Number]} sample Sample to fit
   * @param  {Number} weight description
   */
  #merging(sample, weight){
    var results = this.#getNearestMicroCluster(sample, this.pMicroClusters);
    var nearestPMicroCluster = results.nearestMicroCluster;
    var nearestPMicroClusterIndex = results.nearestMicroClusterIndex;
    var success = this.#tryMerge(sample, weight, nearestPMicroCluster);
    if (!success) { // We failed to insert sample to a c-micro-cluster
      //Then lets try to insert it to a o-micro-cluster
      var results = this.#getNearestMicroCluster(sample, this.oMicroClusters);
      var nearestOMicroCluster = results.nearestMicroCluster;
      var nearestOMicroClusterIndex = results.nearestMicroClusterIndex;

      success = this.#tryMerge(sample, weight, nearestOMicroCluster);
      if (success) { // We did insert it to a o-micro-cluster!
        // Can we upgrade the o cluster to a c-micro-cluster ?
        if (nearestOMicroCluster.weight > this.beta * this.mu){ // Yes we can!!
          this.oMicroClusters = this.oMicroClusters.splice(nearestOMicroClusterIndex,1);
          this.pMicroClusters.push(nearestOMicroCluster);
        }
      }
      else { // We also failed to insert sample to a o-micro-cluster
        // We create a new o-micro-cluster for this sample.
        var microCluster = new MicroCluster(this.lambda, this.t);
        microCluster.insertSample(sample, weight);
        this.oMicroClusters.push(microCluster);
      }
    }
  }



  /**
   * decayFunction - Computes the decay factor based on a given time.
   * We use it to lower the weight of old clusters.
   *
   * @param  {Number} t Current time (i.e. here the number of added samples)
   * @return {Number}   The decay factor
   */
  #decayFunction(t){
    return 2 ** ((-this.lambda) * t) // Math stuff, looks serious.
  }



  /**
   * partialFit - Merges a sample in a micro cluster, then every tp updates
   * clusters to:
   *
   * - remove pMicroClusters that have a too small weight
   * - Check if oMicroClusters are not too small
   *
   * @param  {Array[Number]} sample Value to merge
   * @param  {type} weight weight of the value
   */
  #partialFit(sample, weight){
    this.#merging(sample, weight);
    if (this.t % this.tp ==0){
      var newPMicroClusters = []
      for (var pMicroCluster of this.pMicroClusters){ // Actualize p clusters
        if (pMicroCluster.weight >= this.beta * this.mu) {
          newPMicroClusters.push(pMicroCluster);
        }
      }
      var Xis = [];
      for (var oMicroCluster of this.oMicroClusters) {
        Xis.push( (this.#decayFunction(this.t - oMicroCluster.creationTime + this.tp) -1) / ( this.#decayFunction(this.tp) - 1) )
      }
      var newOMicroClusters = [];
      for (var index = 0; index < this.oMicroClusters.length; index++) {
        if (this.oMicroClusters[index].weight >= Xis[index]) {
          newOMicroClusters.push(this.oMicroClusters[index])
        }
      }
      this.oMicroClusters = newOMicroClusters
    }
    this.t++;
  }



  /**
   * validateSampleWeight - Checks if the weight array is of correct width or
   * initalize it
   *
   * @param  {Array[Number]} sampleWeight  Weight of each sample
   * @param  {Number} numberSamples Number of samples
   * @return {Array[Number]}               Weight of each sample
   */
  #validateSampleWeight(sampleWeight, numberSamples) {
    if (sampleWeight == null) {
      sampleWeight = new Array(numberSamples).fill(1);
    }
    else {
      if (sampleWeight.length != numberSamples){
        print("Invalid weight");
      }
    }
    return sampleWeight
  }
}
