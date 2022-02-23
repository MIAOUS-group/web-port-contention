/**
* This module contains the web-components of PC-Detector.
* These functions are meant to be used by the selenium-controlled browser.
* They contain test to measure contention on specific instructions.
*
**/


const TEST_NUMBER = 1000 // Number of test per setting per instruction


/* --------------------------------------------------------------------------
                                      MISC
   -------------------------------------------------------------------------- */


/**
 * getRandomInt - Creates a random int comprised in [0,max[
 *
 * @param  {Number} max Maximum value
 * @return {Number}     Random integer
 */
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}



/**
 * getRandomFloat - Creates a random float comprised in [0,max[
 *
 * @param  {Number} max Maximum value
 * @return {Number}     Random Float
 */
function getRandomFloat(max) {
  return Math.floor(Math.random() * max);
}




/* --------------------------------------------------------------------------
                              Init WASM functions
   -------------------------------------------------------------------------- */


/**
 * initUnopSpam - Instantiate and export a WebAssembly function that spams a UNOP.
 * This is an async function. Use it with await.
 *
 * @param  {String} instruction The name of the UNOP
 * @return {Function}           Function repeatedly calling the UNOP
 */
async function initUnopSpam(instruction) {
  const wasm = fetch(`./build/${instruction}_spam.wasm`);
  const {instance} = await WebAssembly.instantiateStreaming(wasm);
  var spam = await instance.exports.spam;
  return spam;
}


/**
 * initPunopSpam - Instantiate and export a WebAssembly function that spams a PUNOP.
 * This is an async function. Use it with await.
 *
 * @param  {Array(String)} instructions Both instruction of the PUNOP
 * @return {Function}           Function repeatedly calling the PUNOP
 */
async function initPunopSpam(instructions) {
  const wasm = fetch(`../build/${instructions[0]}_${instructions[1]}_spam.wasm`);
  const {instance} = await WebAssembly.instantiateStreaming(wasm);
  var spam = await instance.exports.spam;
  return spam;
}


/**
 * initUnopSpam - Instantiate and export a WebAssembly function that spams a MEMOP.
 * The main difference is that it is initialized with a memory.
 * This is an async function. Use it with await.
 *
 *
 * @param  {String} instruction The name of the MEMOP
 * @return {Function}           Function repeatedly calling the MEMOP
 */
async function initMemopSpam(instruction) {
  var SZ = 2048;
  var memory = new WebAssembly.Memory({
    initial: SZ,
    maximum: SZ,
    shared: false
  });
  // Don't forget to clean memory or regularly close the browser.
  // Who knew you could have memory leaks in the browser :D
  var wasm = await fetch(`../build/${instruction}_spam.wasm`);
  var {instance} = await WebAssembly.instantiateStreaming(wasm, {env: {mem: memory}});
  var spam = await instance.exports.spam;
  return spam;
}



/* --------------------------------------------------------------------------
                                Test instruction
   -------------------------------------------------------------------------- */


/**
 * testInstruction - Time the execution of a function repeatedly calling an
 * instruction.
 *
 * This is the main function of the web-component of PC-Detector.
 * By calling it in the different setting (P1 contention, p5 contention or control),
 * we can determine if the tested isntruciton creates contention.
 *
 * This is an async function. Use it with await.
 *
 * @param  {String} instruction The name of the tested instruction.
 * @return {Array[Number]}      All the timings of the experiment.
 */
async function testInstruction(instruction) {

  // First, we instantiate the spam function, i.e the function repeatedly
  // calling our instruction
  if ((UNOP.includes(instruction)) || (BINOP.includes(instruction)))  {
    var type = instruction.slice(0,3); // type of the instr, can be i32/64 or f32/64
    var spam = await initUnopSpam(instruction);
  }
  else if (Array.isArray(instruction)) {
    var type = instruction[1].slice(0,3); // here we have two different types
    // we need the input/output of the function.
    var spam = await initPunopSpam(instruction);
  }
  // else if (MEMOP.includes(instruction)) {
  //   var type = instruction.slice(0,3);
  //   var spam = await initMemopSpam(instruction);
  // }
  else if (VOP.includes(instruction)) {
    if (instruction[0]=='v') {
      var numType = "i64";
      var paramCount = "2";
    }
    else {
      var {numType, paramCount} = parseVShape(instruction);
    }
    var spam = await initUnopSpam(instruction);

  }
  var param;

  if (VOP.includes(instruction)) {
    param = []
    switch (numType) { // As we have different types, we instantiate the proper parameter
      case 'i8':
        for (var i = 0; i < Number(paramCount); i++) {
          param.push(getRandomInt(Math.pow(2,7)))
        }
        break;
      case 'i16':
        for (var i = 0; i < Number(paramCount); i++) {
          param.push(getRandomInt(Math.pow(2,15)))
        }
        break;
      case 'i32':
        for (var i = 0; i < Number(paramCount); i++) {
          param.push(getRandomInt(Math.pow(2,31)))
        }
        break;
      case 'i64':
        for (var i = 0; i < Number(paramCount); i++) {
          param.push(BigInt(getRandomInt(Math.pow(2,63))));
        }
        break;

      case 'f32':
        for (var i = 0; i < Number(paramCount); i++) {
          param.push(getRandomFloat(Math.pow(2,31)));
        }
        break;

      case 'f64':
        for (var i = 0; i < Number(paramCount); i++) {
          param.push(getRandomFloat(Math.pow(2,63)));
        }
        break;
      default:
        console.log("Invalid type");
    }
  }
  else {
    switch (type) { // As we have different types, we instantiate the proper parameter
      case 'i32':
        param = getRandomInt(Math.pow(2,31));
        break;
      case 'i64':
        param = BigInt(getRandomInt(Math.pow(2,63)));
        break;

      case 'f32':
        param = getRandomFloat(Math.pow(2,30));
        break;

      case 'f64':
        param = getRandomFloat(Math.pow(2,30));
        break;
      default:
        console.log("Invalid type");
    }
  }

  var timings = [];
  var start, end;
  /*
  * We use performance.now for these measurements.
  * That is because, although it grants a poor resolution and jitter compared to
  * shared array buffers, it is way more constant and resilient to noise.
  *
  * In particular, since we control the number of instruction in a spam function
  * we can put it to a high value (1,000,000), resulting in an execution time in
  * the order of the ms.
  *
  * As performance.now typically has a resolution of 5+-5us on Firefox and 20us
  * on Chrome, it is highly sufficient to measure the differences in this case.
  */
  if (VOP.includes(instruction)) {
    for (var i = 0; i < TEST_NUMBER; i++ ) {
      start = performance.now();
      spam(...param);
      end = performance.now();
      timings.push(end-start);
    }
  }
  else {
    for (var i = 0; i < TEST_NUMBER; i++ ) {
      start = performance.now();
      spam(param);
      end = performance.now();
      timings.push(end-start);
    }
  }
  return timings;

}
