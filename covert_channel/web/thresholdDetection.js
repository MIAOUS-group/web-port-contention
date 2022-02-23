/**
* This module contains an implementation of a threshold based stream algorithm
* to receive frames.
* For each point, we check on which side of the thresold it is to determine if
* it is a 1 or a 0.
* It can be used alone (with hardcoded values) or in pair with DenStream to
* dynamically detect the initialization sequence and calibrate.
**/

/*
* This detector is heavily based on the thresholdResults object.
*
* Here is a description:
*
* thresholdResults = {
*  threshold {Number}: Temporal threshold between 1s and 0s
*  bitCount {Number}: Number of bits received since the detection of the init sequence
*  initSequenceDetected {Boolean}: True if we have detected the initialization sequence, false otherwise
*  bitSize: {
*    0 {Number}: Average time measurements inside of a 1 bit
*    1 {Number }: Average time measurements inside of a 0 bit
*  },
*  clusters: [{ A list of clusters, each composed of:
*    pointCount {Number}: Number of timing measurements in the cluster,
*    bitPosition {Number}: the vbit value of the cluster (1 or 0)
*  }],
*};
*
*/


/* --------------------------------------------------------------------------
                                 CONSTANTS
   -------------------------------------------------------------------------- */

// Hardcoded values if we use this detection alone!

const JMP_THRESHOLD = 1200; // Threshold between 1 and 0
const MERGE_SPIKE = 2; // Small spike to consider outliers
const MIN_SPIKE = 5; // Min size of a spike (for init sequence)
const MAX_SPIKE = 20; // Max size of a spike (for init sequence)



/* --------------------------------------------------------------------------
                                 Utils
   -------------------------------------------------------------------------- */





/**
 * getBitPositionThreshold - Given a point (time measurements), return if it is
 * part of a 1 bit or a 0 bit.
 *
 * @param  {Number} point            Timing measurement
 * @param  {Object} thresholdResults
 * @return {Boolean}                 The value of the bit (1 or 0)
 */
function getBitPositionThreshold(point, thresholdResults) {
 return (point > thresholdResults.threshold);
}



/**
 * getBitCountThreshold - Given a cluster threshold, returns the number of bits
 * it contains.
 *
 * @param  {Object} cluster          Cluster, containing the bitposition as well as the number of point inside.
 * @param  {Object} thresholdResults
 * @return {Number}                  The number of bits inside of the cluster.
 */
function getBitCountThreshold(cluster, thresholdResults) {
  // The bitsize changes whether we see a 0 or 1 bit, so we need to adjust
 let bitSize = thresholdResults.bitSize[Number(cluster.bitPosition)];
 // The bit count is the number  of points divided by the average number of points in a bit
 // We use the round in order to allow for more loose detection (4.4 will be parsed as 4).
 // The max(1,blahblah) stems from the fact that sometimes, clusters are parsed as 0 bits
 // when they should contain 1. The change of bit position can eat bits and create
 // this issue.
 // It does not count outliers (like a 1 measurement cluster) because these are
 // removed by the smoothen function.
 let bitCount = math.max(1,math.round(cluster.pointCount / bitSize));
 return bitCount;
}



/**
 * getTotalBitCountThreshold - Given a thresholdResults object, updates the total
 * bitcount since the initSequence.
 *
 *
 * @param  {Object} thresholdResults
 */
function getTotalBitCountThreshold(thresholdResults){
 if (thresholdResults.initSequenceDetected) {
   bitCount = 0;
   // We simply count all the bits from the cluster
   for (cluster of thresholdResults.clusters) {
     bitCount += getBitCountThreshold(cluster, thresholdResults);
   }
   thresholdResults.bitCount = bitCount;
 }
}



/**
 * getBitsThreshold - Given a thresholdResults object, convert all the clusters
 * to the bitsequence they contain.

 *
 * @param  {Object} thresholdResults
 * @return {Array(Boolean)}  The bit sequence as a array of bits.
 */
function getBitsThreshold(thresholdResults) {
 bits = []
 for (cluster of thresholdResults.clusters){
   for (var i = 0; i < getBitCountThreshold(cluster, thresholdResults); i++) {
     bits.push(Number(cluster.bitPosition));
   }
 }
 return bits.slice(0,DATA_FRAME_SIZE);
}



/**
 * getBitCountThresholdCustom - Given a cluster threshold, returns the number of bits
 * it contains by using a custom bitsize, instead of thresholdResults
 * This is used to try to compensate insertion/deletion errors, more info in
 * the receiver.
 *
 * @param  {Object} cluster          Cluster, containing the bitposition as well as the number of point inside.
 * @param  {Object} thresholdResults
 * @param  {Number} bitSize0         Custom average number of points per 0 bits.
 * @param  {Number} bitSize1         Custom average number of points per 1 bits.
 * @return {Number}                  Number of bits inside the cluster
 */
function getBitCountThresholdCustom(cluster, thresholdResults, bitSize0, bitSize1) {
 if (cluster.bitPosition) {
   var bitSize = bitSize1;
 }
 else {
   var bitSize = bitSize0;
 }
 let bitCount = math.max(1,math.round(cluster.pointCount / bitSize));
 return bitCount;
}



/**
 * getBitsThresholdCustom - Given a thresholdResults object, convert all the
 * clusters to the bitsequence they contain by using custom bit sizes.
 * This is used to try to compensate insertion/deletion errors
 *
 * @param  {Object} thresholdResults
 * @param  {Number} bitSize0         Custom average number of points per 0 bits.
 * @param  {Number} bitSize1         Custom average number of points per 1 bits.
 * @return {Array(Boolean)}          The bit sequence as a array of bits.
 */
function getBitsThresholdCustom(thresholdResults, bitSize0, bitSize1) {
 bits = []
 for (cluster of thresholdResults.clusters){
   for (var i = 0; i < getBitCountThresholdCustom(cluster, thresholdResults, bitSize0, bitSize1); i++) {
     bits.push(Number(cluster.bitPosition));
   }
 }
 return bits.slice(0,DATA_FRAME_SIZE);
}


 /* --------------------------------------------------------------------------
                          Threshold detector
    -------------------------------------------------------------------------- */

/**
 * initThresholdDetection - Initialize the thresholdResults object
 *
 * @param  {Number} threshold Temporal threshold between 1 and 0
 * @return {Object}           initalized thresholdResults
 */
function initThresholdDetection(threshold) {
  var thresholdResults = {
    threshold: threshold,
    bitCount: 0,
    initSequenceDetected: false, //  set to 1 when we detect it
    bitSize: { //Hardcoded, change if you use denstream to detect init sequence
      0:11,
      1:9
    },
    clusters: [{ // We initalize the cluster array with a empty cluster
      // We set it to 0 as when we start listening, it is rare to directly receive a 1
      pointCount: 0,
      bitPosition: 0
    }],
  };
  return thresholdResults
}



/**
 * detectInitSequenceThreshold - Each time we detect a new cluster, we check
 * our buffer to see if it contains the initalization sequence.
 * To detect it, we check for 101 pattern, where each cluster has a reasonable
 * number of bits (not too short to remove outliers, not too big to make sure it
 * a bit and not no signal at all).
 *
 * We only use 3 bits out of the 4 of the initSequence.
 * That is because the 4th could be mixed with following bits, as we don't know
 * the position of the 5th bit.
 *
 * If it is detected, we remove all previous clusters from our list, and stop
 * looking for the init sequence.
 *
 * This function does not remove anything but modifies thresholdResults.
 * @param  {Object} thresholdResults description
 */
function detectInitSequenceThreshold(thresholdResults) {
  cLen = thresholdResults.clusters.length //Number of cluster in our cluster buffer
  if ( cLen >= 3 ) {
    possibleInitSequence = [thresholdResults.clusters[cLen-3],thresholdResults.clusters[cLen-2],thresholdResults.clusters[cLen-1]]
    // Check if we have a 101 sequence in our possible init sequence:
    if ((possibleInitSequence[0].bitPosition == 1) & (possibleInitSequence[1].bitPosition == 0) & (possibleInitSequence[2].bitPosition == 1)){

      // For each cluster, we check if the number of measurements inside is
      // in the right order of a bit, to be sure not to detect noise.
      if ((possibleInitSequence[0].pointCount > MIN_SPIKE) & (possibleInitSequence[1].pointCount > MIN_SPIKE) & (possibleInitSequence[2].pointCount > MIN_SPIKE) & (possibleInitSequence[0].pointCount < MAX_SPIKE) & (possibleInitSequence[1].pointCount < MAX_SPIKE) & (possibleInitSequence[2].pointCount < MAX_SPIKE))
      thresholdResults.initSequenceDetected = true;
      thresholdResults.clusters = possibleInitSequence; // Remove all previous clusters since we don't need them.
    }
  }
}



/**
 * smoothen - This function removes outlier clusters.
 * They are clusters caused by anormally large or low time measurements, and
 * cause spikes in the stream.
 *
 * We assume that a cluster with 1 or 2 element is a spike and not caused by
 * the reception of information.
 *
 * In that case, we merge it with the previous cluster in the thresholdResults
 * cluster list.
 *
 * @param  {Object} thresholdResults
 */
function smoothen(thresholdResults) {
  // We don't work with the last cluster !
  // That is because it does not have its full point count yet.
  // Hence we work on the second to last cluster, which is fully formed
  if (thresholdResults.clusters[thresholdResults.clusters.length -2].pointCount <= MERGE_SPIKE) {
    // We merge the second to last in the third to last
    thresholdResults.clusters[thresholdResults.clusters.length - 3].pointCount += thresholdResults.clusters[thresholdResults.clusters.length -2].pointCount;
    // And the last one too !
    thresholdResults.clusters[thresholdResults.clusters.length - 3].pointCount += thresholdResults.clusters.last().pointCount;
    // Remove obsolete clusters
    thresholdResults.clusters.pop();
    thresholdResults.clusters.pop();
  }
}



/**
 * parseNewPointThreshold - Main function of the detector !
 * For each new point, we feed it to our detector.
 *
 * This function handles the detection of the initalization sequence, and then
 * listens for bits until it has received the whole frame
 *
 * @param  {Number} point             New timing measurement to parse
 * @param  {Object} thresholdResults
 */
function parseNewPointThreshold(point, thresholdResults) {
  //The function is separated in two different cases
  // First, if the new point is in the same bit position than the last cluster
  // This means it belongs to this cluster
  if (getBitPositionThreshold(point, thresholdResults) == thresholdResults.clusters.last().bitPosition) {
    // So we update it
    thresholdResults.clusters.last().pointCount++;


    // We still sometime check if we have enough bits to have the whole frame,
    // even when no new cluster is detected.
    // It is particularly useful at the end of the frame, as a frame ending with
    // 0 will not have a distinction between the last 0 and no signal.
    if ((thresholdResults.clusters.last().pointCount%100 == 0) & (thresholdResults.initSequenceDetected)) {
      getTotalBitCountThreshold(thresholdResults);
    }
  }

  // Otherwise, we have a new cluster !
  // This means that we switched from 0 to 1 ! Lets parse stuff
  else {
    // We check if the previous cluster was not an outlier
    if (thresholdResults.initSequenceDetected) smoothen(thresholdResults);

    // We check if we can stop listening
    if (thresholdResults.clusters.last().pointCount%100 == 0) {
      getTotalBitCountThreshold(thresholdResults)
    }

    // If we have not find the initialization sequence, we check if we have it now
    if (!thresholdResults.initSequenceDetected) {
      detectInitSequenceThreshold(thresholdResults)
    }

    // In the end, let's add the new cluster !
    thresholdResults.clusters.push({
      pointCount: 1,
      bitPosition: getBitPositionThreshold(point, thresholdResults)
    });
  }
}
