/**
* This is the class implementation of the Micro Cluster of the DenStream algorithm, presented in the
* following paper:
* Feng Cao, Martin Estert, Weining Qian, and Aoying Zhou. Density-Based
* Clustering over an Evolving Data Stream with Noise.
*
*
* This code is largely based on Denstream Python implementation by  Issa Memari
* available here: https://github.com/issamemari/DenStream
 */

 /**
  * Represents a micro cluster, either c or o.
  */
class MicroCluster {



  /**
   * constructor - Creates a new micro cluster.
   *
   * @param  {Number} lambda    The forgetting factor. The higher the value, the
   * lower importance of the historical data compared to more recent data.
   * @param  {Number} creationTime Time of the creation, i.e. the number of
   * samples previously inserted.
   */
  constructor(lambda, creationTime) {
    this.center = 0;
    this.pointNumber = 0;
    this.lambda = lambda;
    this.decayFactor = 2 ** (-lambda);
    this.variance = 0;
    this.weight = 0;
    this.creationTime = creationTime;
    this.points = []
  }



  /**
   * insertSample - Insert a sample to the micro cluster.
   * The cluster does not have a buffer with all points, so we change all values
   * by hand: its weight, center and variance
   *
   * @param  {Array[Number]} sample The sample to insert
   * @param  {Number} weight weight of the sample
   */
  insertSample(sample, weight){
    if (this.weight != 0) { // We make sure the cluster is not empty
      // Update sum of weights: we apply the decayfactor to the former weight to
      // lower it, then add the new weight
      var oldWeight = this.weight;
      var newWeight = oldWeight * this.decayFactor + weight;

      // Update center by taking the weighted average between the new sample
      // and the former center.
      var oldCenter = this.center;
      var newCenter = []
      for (var index = 0; index < oldCenter.length; index++) {
        newCenter.push(oldCenter[index] + ((weight / newWeight) * (sample[index] - oldCenter[index])));
      }

      // Update Variance
      var oldVariance = this.variance;
      var newVariance = [];
      for (var index = 0; index < oldCenter.length; index++) {
        newVariance.push((oldVariance[index] * ((newWeight - weight) / oldWeight)) + (weight * (sample[index] - newCenter[index]) * (sample[index] - oldCenter[index])));
      }

      // Update the actual values
      this.center = newCenter;
      this.variance = newVariance;
      this.weight = newWeight;
      this.pointNumber++;
      this.points.push(sample);
    }
    else { // If its empty, we simply update the value to fit the sample.
      this.center = sample
      this.weight = weight
      this.pointNumber++;
      this.variance = new Array(this.center.length).fill(0);
      this.points.push(sample);
    }
  }



  /**
   * radius - Computes the radius of the cluster
   *
   * @return {Number}  the radius of the cluster (NaN if empty)
   */
  radius(){
    if (this.weight > 0){
      var radius = [];
      for (var i = 0; i < this.variance.length; i++) {
        radius.push(math.sqrt(this.variance[i]/this.weight));
      }
      return math.norm(radius);
    }
    else{
      return NaN
    }
  }



  /**
   * copy - Create a deep copy of the micro cluster
   *
   * @return {MicroCluster}  Copy of the micro cluster
   */
  copy(){
    var newMicroCluster = new MicroCluster(this.lambda, this.creationTime);
    newMicroCluster.weight = this.weight;
    newMicroCluster.variance = this.variance;
    newMicroCluster.center = this.center;
    newMicroCluster.pointNumber = this.pointNumber;

    return newMicroCluster
  }




}
