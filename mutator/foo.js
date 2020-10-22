function test( num ) {
    return num * num;
}

var a = 1 + 1;
console.log(test(3));

if ((a == 2) || (test(4) == 90)) {
    console.log('lol');
}

WebAssembly.instantiateStreaming(fetch('simple.wasm'), importObject)