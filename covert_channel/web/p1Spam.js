/**
* This module contains function to intialize WebAssembly functions to create
* contention on port 1.
*
* We use two different instructions:
* i64.ctz to send bits.
* i64.rem_u to receive bits.
**/




/**
 * initCTZSpam - Initalize and return a WebAssembly function repeatedly calling
 * the i64.ctz instruction to create contention on port 1.
 *
 * This is an async function and must be used with await.
 *
 * @return {Function}  A WebAssembly function creating contention with i64.ctz.
 */
async function initCTZSpam() {
  const wasm = fetch('./build/ctz_spam.wasm');
  const {instance} = await WebAssembly.instantiateStreaming(wasm);
  var ctz_spam = await instance.exports.ctz_spam;
  return ctz_spam
}



/**
 * initCTZSpam - Initalize and return a WebAssembly function repeatedly calling
 * the i64.rem_u instruction to create contention on port 1.
 *
 * This is an async function and must be used with await.
 *
 * @return {Function}  A WebAssembly function creating contention with i64.rem_u.
 */
async function initREMSpam() {
  const wasm = fetch('./build/rem_spam.wasm');
  const {instance} = await WebAssembly.instantiateStreaming(wasm);
  var rem_spam = await instance.exports.rem_spam;
  return rem_spam
}
