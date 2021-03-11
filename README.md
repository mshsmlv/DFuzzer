# DFuzzer

DFuzzer is a coverage-guided, grammar-based fuzzer for JavaScript engines. The distinctive feature of this fuzzer is constructing grammar. Instead of setting grammar rules by hand, this fuzzer constructs the grammar from a set of JavaScript programs. This approach improved finding new paths in the target JavaScript Engine.

See the principles of work and measurement results in [paper](http://vital.lib.tsu.ru/vital/access/manager/Repository/vital:13533) (In Russian only).

Inspired by [the Nautilus Fuzzer](https://github.com/nautilus-fuzz/nautilus).

## Deploy

Fuzzer is based on [AFL++](https://aflplus.plus/). You need to download source code from the [official AFL++ repository](https://github.com/AFLplusplus/AFLplusplus) and build it with a pre-installed python3-dev package.

For more insforamtion see:
- [Build and install AFL++](https://aflplus.plus/building/)
- [Custom Mutators](https://aflplus.plus/docs/custom_mutators/)

```bash
sudo apt install python3-dev

git clone https://github.com/AFLplusplus/AFLplusplus
cd AFLplusplus
make distrib
sudo make install
```

## Run DFuzzer

Run node server:

```bash
git clone https://github.com/MashaSamoylova/DFuzzer
cd DFuzzer/mutator
npm install
node mutator.js
```

Open another terminal and run AFL++.
```bash
export PYTHONPATH='<path-to-DFuzzer-derectory>/DFuzzer/afl-mutator'
export AFL_PYTHON_MODULE=mutator

AFL_CUSTOM_MUTATOR_ONLY=1 afl-fuzz -m none -i input -o output_test -- ./js -d @@ 
```
