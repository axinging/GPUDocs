node  --experimental-wasm-threads --experimental-wasm-bulk-memory  thread_test.js
1. https://emscripten.org/docs/getting_started/downloads.html

git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
git pull
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

2. emsdk$ vim upstream/emscripten/src/library_pthread.js
./emscripten/src/library_pthread.js

```
  emscripten_thread_pool_size: function() {
#if PTHREAD_POOL_SIZE
    const pthreadPoolSize = {{{ PTHREAD_POOL_SIZE }}};
    if (pthreadPoolSize > _emscripten_num_logical_cores()) {
      err('PTHREAD_POOL_SIZE is bigger than emscripten_num_logical_cores()!');
    }
    return pthreadPoolSize;
#else
    return 0;
#endif
  },
```
./emscripten/cache/sysroot/include/emscripten/threading.h
```
// Returns the thread pool size on the system.
int emscripten_thread_pool_size(void);
```
Example: https://github.com/emscripten-core/emscripten/pull/14159 (Note: the .h are different)



3. Build example
```
// https://developers.google.com/web/updates/2018/10/wasm-threads

// Build and run with node: 
// emcc -O2 -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=2 -o thread_pool_size.js thread_pool_size.c
// node  --experimental-wasm-threads --experimental-wasm-bulk-memory thread_num_cores.js

// Build and run with browser:
// emcc -O2 -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=4  -s  --emrun  -o thread_pool_size.html thread_pool_size.c
// emrun --no_browser thread_pool_size.html

#include <emscripten.h>
#include <emscripten/threading.h>
#include <stdio.h>

// Calculate Fibonacci numbers shared function
int main(int argc, char *argv[]) {
    // Calculate on the foreground thread
    int num_cores = emscripten_num_logical_cores();
    int num_poolsize = emscripten_thread_pool_size();
    printf("num_cores %d, num_poolsize=%d\n",num_cores, num_poolsize);

    return 0;
}
```