const WEBSOCKET_URL = "ws://127.0.0.1:8080/";
const WEBSOCKET_PROBE_DATA = ".";
var websocket = {};
var RESULTS = []
const BM = 128 * 1024 * 1024; // Eviction buffer
const WP = 64 * 1024; // A WebAssembly page has a constant size of 64KB
const SZ = BM / WP; // 128 hardcoded value in wasm



function medianSmooth(values, medianSize) {
  smoothenValues = []
  for (var i = 0; i < values.length - medianSize; i+= medianSize) {
    smoothenValues.push(math.median(values.slice(i,i+medianSize)))
  }
  return smoothenValues
}
function averageSmooth(values, medianSize) {
  smoothenValues = []
  for (var i = 0; i < values.length - medianSize; i+= medianSize) {
    smoothenValues.push(math.mean(values.slice(i,i+medianSize)))
  }
  return smoothenValues
}

async function initCTZSpam(memory) {
  const wasm = await fetch('../build/ctz_spam.wasm');
  const bin = await wasm.arrayBuffer();
  const module = new WebAssembly.Module(bin);
  const instance = await new WebAssembly.Instance(module);
  var ctz_spam = await instance.exports.ctz_spam;
  return ctz_spam;
}

const LISTEN_TIME = 1000

async function detectBit() {
    // const memory = new WebAssembly.Memory({
    //   initial: SZ,
    //   maximum: SZ,
    //   shared: true
    // });
    // var clock = await initWasmClock(memory);
    var clock = await initSAB();
    var spam = await initCTZSpam();
    var a,b;
    res = [];
    for (var i = 0; i <400000; i++) {
      // a = Atomics.load(clock.array,0);
      a = clock.array[0];
      // a = performance.rdtsc(); // custom browsers only
      spam(BigInt(13));
      // b = performance.rdtsc();
      b = clock.array[0]
      // b = Atomics.load(clock.array,0);
      res.push(b-a);

     }
     console.log("done listening");
     await clock.worker.terminate();
     res_s = medianSmooth(res, 20);

     // res_ss = averageSmooth(res_s, 2);
     RESULTS = res_s;
     console.log("done")
}

// async function detectBit() {
//
//   // var clock = await initSAB();
//   await createAndAwaitWebsocket(WEBSOCKET_URL)
//   websocket.send(WEBSOCKET_PROBE_DATA);
//   var spam = await initCTZSpam();
//   var a,b;
//   res = [];
//   // start = performance.now();
//   // while (performance.now() < start + LISTEN_TIME) {
//   for (var i = 0; i <100000000; i++) {
//     // a = clock.array[0];
//     spam();
//     // websocket.send(WEBSOCKET_PROBE_DATA);
//
//
//     // b = clock.array[0];
//     // res.push(b-a);
//   }
//   console.log("done listening");
//   websocket.send('END');
//
//   // await clock.worker.terminate();
//   // res_s = medianSmooth(res, 10)
//   // res_ss = averageSmooth(res_s, 10)
//   // console.log("plotting");
//   //
//   // var data = [
//   // {
//   //   y: res,
//   //   type: 'bar'
//   // }  ];
//   // var layout = {
//   // yaxis: {range: [0, 10]}
//   // };
//   // Plotly.newPlot('bar-chart', data, layout);
// }

function plot() {
  // res = RESULTS.slice(1,-1).split(", ").map(Number).slice(1);
  res = RESULTS
  var data = [
  {
    y: res,
    type: 'bar'
  }  ];
  var layout = {
  yaxis: {range: [0, 300]}
  };

  Plotly.newPlot('bar-chart', data, layout);
}
