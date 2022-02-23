/**                                  Utils                                   **/
/**
This part mainly contains useful tools for further functions
Mainly cluster functions.
**/



/**
 * compareClusters - Compare two clusters based on the X position
 * Used to sort clusters along the X axis
 *
 * @param  {MicroCluster} cluster1
 *
 * @param  {MicroCluster} cluster2
 *
 * @return {type} -1 if cluster1 is before on the X axis, 1 otherwise
 */
function compareClusters(cluster1, cluster2){
  if (cluster1.center[0] <= cluster2.center[0]) {
    return -1
  }
  if (cluster1.center[0] > cluster2.center[0]) {
    return 1
  }
}



/**
 * getBitPosition - Determines if a given cluster represent 1 or 0  value bits
 *
 * IMPORTANT: Remember to change this function according to the value of bits.
 * For instance, in certain case timing(1) > timing(0) and other case vice versa.
 *
 *
 * @param  {MicroCluster} cluster
 *
 * @param  {Number} threshold Average value between timings of 1 and 0 bits.
 *
 * @return {Number}           The bit value of the cluster (1 or 0).
 */
function getBitPosition(cluster, threshold) {
  return Number(cluster.center[1] > threshold) // 1 Value bits are lower than 0
  // value bits in this particular case.
}



/**
 * getBitNumber - Returns the number of bit a micro cluster holds
 * This is because we only detect jumps, but we don't know the number of bits
 * between these jumps: it could be 101 or 10000000000000000000000000000001
 *
 *
 * @param  {MicroCluster} cluster
 *
 * @param  {Object} results Set of params and results
 *
 * @return {Number}         The number of bits held in the cluster.
 */
function getBitNumber(cluster, results) {
  /**
   * To do stuff properly, we need to know the bit position of the cluster.
   * That is because 0-bits (no port contention) and 1-bits (port contention)
   * have different execution time.
   * But the real, temporal, duration of a bit, as sent by the native sender, is
   * constant. This means that, for a certain bit, the number of experiment
   * differ.
   * Since we use that number of points/experiments to distinguish the bit number,
   * we need to differentiate 1s and 0s.
  **/
  bitPosition = getBitPosition(cluster, results.threshold);

  return math.round(cluster.points.length / results.bitSize[bitPosition])
}



/**
 * initClusterer - Initiate the cluster and the result object.
 * The result object will be updated during the stream with all the information
 * required to decode the frame.
 *
 * @param  {Number} lambda = 0.01 The forgetting factor. The higher the value, the
 * the lower importance of the historical data compared to more recent data.
 *
 * @param  {Number} eps = 100     The maximum distance between two samples for
 * them to be considered as in the same neighborhood.
 *
 * @param  {Number} beta = 0.5    The parameter to determine the threshold of
 * outlier relative to c micro clusters
 *
 * @param  {Number} mu = 3        The minimal weight to be considered a micro
 * cluster.
 *
 * @return {DenStream, Object}               The main clusterer and our result object
 */
function initClusterer(lambda = 0.01, eps = 100, beta = 0.5, mu = 3) {
  var clusterer = new DenStream(lambda = lambda, eps = eps, beta = beta, mu = mu);
  var results = {
      startIndex: null, // Index of the first cluster of the frame.
      clusters: [],     //All clusters of the frame.
      bits: [],         // Bits of the frame.
      bitNumber: 0,     // Number of bits that are currently detected. This is
                        //what we use to know when to stop listening.
      threshold: null,  // Threshold to distinguish 1s from 0s.
      bitSize: null,    // Average number of experiment per bits.
      initSequence: []  // Clusters of the init sequence (only 3 out of 4,
                        //because we cannot use the 4th to calibrate)
  };
  return {clusterer, results}
}


/**                 Initialization sequence and calibration                  **/

/**
This part contains function related to the init sequence and the beginning of
the frame.

Our goal is to detect the frame (ending and beginning) in real time with a stream
of data.

We use the Initialization sequence in order to detect the beginning of the frame
Since it is always 1010, we can check that pattern to see the start.
Furthermore, we can use it to interpolate several useful values to decode the
rest of the frame, such as the threshold between 1s and 0s as well as the average
number of point in a bit.
**/



/**
 * checkInitSequenceStream - Checks the initsequence part of the result object
 * if it contais a 101, it considers it the real init sequence, and calibrates
 *
 * We use an arbitrary threshold ratio to distinguish 1 from 0 here, its bad
 * practice
 *
 * This function returns nothing but directly updates the result object
 *
 * @param  {Array[MicroCluster]} clusters    All previously detected clusters
 * @param  {Object} results
 * @param  {Number} threshold = 1.05 Multiplicative threshold to distinguish jumps
 */
function checkInitSequenceStream(clusters, results, threshold = 1.40) {
  if (results.initSequence.length == 3) { // we need to make sure our buffer is filled
    if ((results.initSequence[0].center[1] > threshold * results.initSequence[1].center[1]) & (threshold * results.initSequence[1].center[1] < results.initSequence[2].center[1])) {
      results.startIndex = clusters.length - 4; // we get the start index, ie
      // the index of the first clsuter of the frame
      results.bitNumber = 3; // we have 101
      for (var i = 0; i < 3; i++) {
        results.clusters.push(results.initSequence[i]);
      }
      calibrate(results) // We get the threshold as well as bitsize

    }
  }
}



/**
 * calibrate - Use the initalization sequence to get useful information, such
 * as bitSize (the average number of point in a single bit) and threshold (
 * to distinguish 1s from 0s)
 *
 * Note that we only work with the first 3 bits of the initalization sequence.
 * That is because, although we know the 4 bits of the initalization sequence,
 * (1010), we don't know if the next one will be (10101) or (10100), so we cannot
 * use the 4th cluster to determine the bitsize.
 *
 * This function returns nothing but directly updates the result object
 *
 * @param  {Object} results
 */
function calibrate(results) {
  results.threshold = (results.clusters[0].center[1] + 2*results.clusters[1].center[1] + results.clusters[2].center[1]) / 4
  results.bitSize = {
    0: results.clusters[1].pointNumber,
    1: (results.clusters[0].pointNumber + results.clusters[2].pointNumber)/2
  };
}






/**                         Merging and update function                      **/



function mergeClusters(cluster1, cluster2) {
  var newMicroCluster = new MicroCluster((cluster1.lambda + cluster2.lambda)/2, (cluster1.creationTime + cluster2.creationTime)/2);
  newMicroCluster.weight = cluster1.weight + cluster2.weight;
  newMicroCluster.pointNumber = cluster1.pointNumber + cluster2.pointNumber;
  newMicroCluster.center = [];
  for (var i = 0; i < cluster1.center.length; i ++) {
    newMicroCluster.center.push((cluster1.center[i] + cluster2.center[i])/2);
  }
  newMicroCluster.points = cluster1.points.concat(cluster2.points);

  return newMicroCluster

}


/**
 * updateClusterList - This is the main part of the algo
 * It handles the biggest issue DenStream detection faced: detecting 2 clusters
 * instead of 1. This happens often for long successive identical bits such as
 * 100001.
 * Basically, for each new cluster, this function check if it is a split.
 *   - If so, it merges it with the last one and update the result object
 *   - If not, it adds it to the cluster buffer and updates results
 *
 * This function is a bit too long, it may be splitted later
 *
 * It distinguish two cases:
 *  - After the detection of the initialization sequence, so when listening to
 * the acutal frame. Here we can use our threshold to distinguish if the two
 * clusters have a shared bit value (ie we need to merge them). In that case, it
 * will also update the bitnumber and eveything accordingly
 *  - Before the detection of the init sequence. Here, we use a multiplicative
 * threshold to distinguish 1s from 0s -it is way less stable but it does the job.
 *
 * @param  {Object} results
 *
 * @param  {MicroCluster} newCluster Cluster to merge or insert
 *
 * @param  {type} eps = 1.03 Multiplicative threshold to detect whether we need
 * to merge or not
 *
 */
function updateClusterList(results, newCluster, eps = 1.25) {
  if ((results.clusters.length > 0) & (results.startIndex != null)) {
    /**
     * Standard scenario: we have already found the init sequence so we can
     * detect jumps based on the threshold interpolated from the init sequence.
     * This is more stable than the ratio-based detection used before the
     * detection of the init sequence
    **/
    //We check if there is a jump between the two clusters
    var oldBitPosition = getBitPosition(results.clusters.last(), results.threshold);
    var newBitPosition = getBitPosition(newCluster , results.threshold);
    if ((results.clusters.last().center[0] != newCluster.center[0])) {
      if (oldBitPosition == newBitPosition) {
        /** If there is no jump, we probably need to join.
        *  Sometimes, the same cluster gets detected twice, so we remove that case
        *  by checking the x axis center of the cluster
        *
        * To join the clusters, we merge them by averaging the centers, and adding
        * the weight and the number of points.
        * To know when to stop, we also need to keep track of the number of bits
        * we read! So we remove the number of bits of the last cluster, and add
        * the bit number of the merged cluster !
        **/

        // We remove the bits of the former cluster.
        var oldBitNumber = getBitNumber(results.clusters.last(), results);
        results.bitNumber -= oldBitNumber;
        // Then we compute the new cluster and set it in our cluster buffer.
        // and update our bit count!
        results.clusters[results.clusters.length - 1] = mergeClusters(results.clusters.last(), newCluster);
        var newBitNumber = getBitNumber(results.clusters.last(), results);
        results.bitNumber += newBitNumber;
      }
      else {
        /**
         * No need to join here since we have a jump.
         * We simply add the cluster to our buffer to parse it as bits later
         * and we update our bit count.
        **/
        results.clusters.push(newCluster);
        var bitNumber = getBitNumber(newCluster, results);
        results.bitNumber += bitNumber;
      }
    }
    calibrate(results); // This is because we may merge something in the last
    // cluster of the init sequence, so we may need to actualize the bit size.
  }

  else if (results.startIndex == null) {
    /**
     * Here, we don't have the init sequence. In order to still merge clusters
     * if we need, we detect clusters with a similar y (timing) value, using the
     * epsilon given in parameter.
    **/
    if (results.initSequence.length == 3) { // We need to have the full init sequence
      if ((newCluster.center[1] < results.initSequence.last().center[1] * eps) & (newCluster.center[1] > results.initSequence.last().center[1] / eps)){
        /**
         * The jump here is too small to be a jump from 0 to 1 or vice versa.
         * We merge stuff! If not, the algorithm will not detect the init sequence
         * destroying everything.
        **/
        if (newCluster.center[0] != results.initSequence.last().center[0]) {
          /** Like above, we check if it is not twice the same cluster.
           * If not, we update our init sequence with the merged cluster.
           * We do not need to update our bitcount yet since we have not
           * added it to the cluster buffer
          **/
          results.initSequence[results.initSequence.length - 1] =  mergeClusters(results.initSequence.last(), newCluster);
        }
      }
      else {
        /**
         * Here, there is no jump.
         * We keep on going. Since the current initSequence buffer doesnt have the
         * real init sequence in it, we keep sliding it, by removing the first
         * element and adding the next one in the third place.
        **/
        results.initSequence[0] = results.initSequence[1];
        results.initSequence[1] = results.initSequence[2];
        results.initSequence[2] = newCluster;
        // Once again, no need to update bit count.
      }
    }
    else { // we don't have three elements in our init sequence so we just add.
      results.initSequence.push(newCluster)
    }
  }
}




/**                             Stream functions                             **/




/**
 * parseNewCluster - This function is called when a new p-micro-cluster appears
 * Notice that it does not treat the last appeared cluster, because it is not
 * fully filled, but the SECOND TO LAST cluster.
 * That is because, due to our data shape, we know that the second to last cluster
 * (by temporal order) is filled, so we can properly treat it.
 *
 * Basically, the function update the cluster list with our new cluster, and
 * if it didnt detect the start of the frame yet, it checks for the init sequence.
 *
 * @param  {Array[MicroCluster]} clusters All detected clusters
 *
 * @param  {Object} results
 *
 */
function parseNewCluster(clusters, results) {
  if (clusters.length > 2) {
    updateClusterList(results, clusters[clusters.length - 2]);
    if (results.startIndex == null) {
      checkInitSequenceStream(clusters, results);
    }
  }
}



/**
 * parseNewPoint - Main stream function, this is the one called from outside
 * this module.
 * It takes every new point(s), fits it in the clusterer, checks if a new cluster
 * appears, and treats it if need be.
 *
 * @param  {Array[Number]} point     New streaming value
 * @param  {DenStream} clusterer
 * @param  {Object} results
 */
function parseNewPoint(point, clusterer, results) {
  var oldClusterCount = clusterer.pMicroClusters.length
  clusterer.partialFit(point);
  var newClusterCount = clusterer.pMicroClusters.length

  if (oldClusterCount != newClusterCount) { // A new cluster has appeared, so we treat it
      // clusterer.pMicroClusters.sort(compareClusters);
    parseNewCluster(clusterer.pMicroClusters, results);
  }
}





/**                                 End game                                 **/


/**
 * getBits - Final function to convert the filled result object to the detected
 * bits - and if everything went well the whole frame!
 *
 * @param  {Object} results
 * @param  {Number} frameSize To know where to stop decoding! Sometime, if the
 * last cluster is too big we can get parasite bits and we dont want that.
 * @return {Array[Number]} Our frame as 1s and 0s.
 */
function getBits(results, frameSize) {
  bits = [];
  for (cluster of results.clusters) {
    bitPosition = getBitPosition(cluster, results.threshold);
    bitNumber = getBitNumber(cluster, results);
    newBits = Array(bitNumber).fill(bitPosition);
    bits = bits.concat(newBits);
  }
  return bits.slice(0,frameSize)
}






/**                               Misc / tests                               **/
function offlineDenStreamDetection(timings, xWeight = 20, lambda = 0.1, eps = 150, beta =0.5, mu = 2, frameSize = DATA_FRAME_SIZE) {
  var data = []
  var   plott = [[],[]];
  for (var index = 0; index < timings.length; index++) {
    data.push([ index * xWeight, Number(timings[index]) ]);
    plott[0].push(index*xWeight)
    plott[1].push(Number(timings[index]))
  }

  var {clusterer, results} = initClusterer(lambda, eps, beta, mu);
  for (var index = 0; index < timings.length; index++) {
    parseNewPoint([data[index]], clusterer, results);
    if (results.bitNumber >= frameSize) {
      break
    }
  }

  bits = getBits(results, frameSize)
  console.log(bits)
  clusterer.pMicroClusters.sort(compareClusters)
  console.log("P Micro Clusters: ", clusterer.pMicroClusters)
  console.log("O Micro Clusters: ", clusterer.oMicroClusters)
  console.log(results);
  // plotEvolution(plott)

  trueBitSequence = [1,0,1,0,0,1,1,0,0,1,1,0,0,1,0,1,0,1,0,0,0];
  return (JSON.stringify(bits) == JSON.stringify(trueBitSequence))
}


function bruteForceParamDetection() {
  for (var xWeight = 1; xWeight < 20; xWeight+=1) {
    for (var lambda = 0.01; lambda <2; lambda+=1) {
      for (var eps = 10; eps < 1000; eps*=1.1) {
        for (var beta = 0.1; beta < 5; beta*=2) {
          for (var mu = 0.1; mu < 5; mu*=2) {
            if (offlineDenStreamDetection(tt, xWeight, lambda, eps, beta, mu)) {
              console.log(xWeight, lambda, eps, beta, mu)
            }
          }
        }
      }
    }
  }
}
