const BUFFER_ELEMENT_SIZE = 32;

/**
 * initSAB : initializes a timer bsed on a SharedArrayBuffer (SAB) and gives a promise on the timer
 *
 * @param: {Boolean} atomic Set to true if you want the incrementation to use the atomic library (ie proper concurrent access.)
 * This means slower incrementation (thus lower resolution) but reduce overall outliers.
 * @return {Promise} A Promise on the timer.
 * If resolved, it gives an object with the following fields:
 *    -array: An Array you can pass to measureSAB
 *    -worker: The created worker. Don't forget to terminate it
 *    after your measurements, if not it will run until you close your tab
 */

function initSAB(atomic = true){
  return new Promise((resolve,reject) => {
    var increment;
    if (atomic) {
      increment = "Atomics.add(arr, 0, 1);"
    }
    else {
      increment = "arr[0]++;"
    }
    const code = `onmessage = function(event) {
        var buffer=event.data;
        var arr = new Uint32Array(buffer);
        postMessage("done");
        while(1) {
          ${increment}
       }
    }`;
    let buffer = new SharedArrayBuffer(BUFFER_ELEMENT_SIZE);
    const blob = new Blob([code], { "type": 'application/javascript' });
    const url = window.URL || window.webkitURL;
    const blobUrl = url.createObjectURL(blob);
    const counter = new Worker(blobUrl);
    counter.onmessage = e => {
      const res = new Uint32Array(buffer);
      window.setTimeout(() => {
        resolve({
            array: res,
            worker: counter
        });
      },10);
    };
    counter.onerror = reject;
    counter.postMessage(buffer);
  });
}
