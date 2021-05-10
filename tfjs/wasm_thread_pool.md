本文通过WASM的编译选项PTHREAD_POOL_SIZE和pthreadpool_create来理解WASM的线程池的概念。

在TFJS wasm里面，有两个地方会涉及到线程池大小：
1. 在TFJS编译的时候，会通过PTHREAD_POOL_SIZE来指定线程池的大小, 并创建相应大小的线程池。
2. 与此同时，在wasm/backend.cc（https://github.com/tensorflow/tfjs/blob/master/tfjs-backend-wasm/src/cc/backend.cc#L65 ） 里面，pthreadpool_create也会创建一个线程池，这个线程池的大小可以通过一个thread_count的参数就指定。


两个线程池之间的关系是：
1. 编译选项PTHREAD_POOL_SIZE决定的是真正的Thread Pool，称作real Thread Pool，其实就是PTHREAD_POOL_SIZE个Web Worker。具体代码在https://github.com/emscripten-core/emscripten/blob/main/src/library_pthread.js 。
2. pthreadpool_create创建的POOL，其实是从real Thread Pool取出若干个线程，它应该是real Thread Pool的子集,称作fake Thread Pool。

所以要注意：在WASM平台，pthreadpool_create并不是创建线程池，而是从已经创建好的线程池里面取出若干线程而已。

两个线程池的大小关系是：
既然pthreadpool_create创建的线程池是从real Thread Pool里面取得的，所以其参数thread_count <= PTHREAD_POOL_SIZE.

下面是代码分析。
### real Thread Pool的创建（创建PTHREAD_POOL_SIZE个Web Worker）

编译选项PTHREAD_POOL_SIZE决定了创建了几个Web Worker （linkops： https://github.com/tensorflow/tfjs/pull/4957/files#diff-7b82359d52b7dc5160e130024cc2759216a1a0fc63769dad1c5d076a362bf6e1R62）

library_pthread.js会创建PThread对象。这个对象根据PTHREAD_POOL_SIZE的大小，创建一个PThread.unusedWorkers数组，成员是Web Worker。

```
#if PTHREAD_POOL_SIZE
      var pthreadPoolSize = {{{ PTHREAD_POOL_SIZE }}};
      // Start loading up the Worker pool, if requested.
      for (var i = 0; i < pthreadPoolSize; ++i) {
        PThread.allocateUnusedWorker(); //PThread.unusedWorkers.push(new Worker(pthreadMainJs))
      }
#endif
```
只要WASM enable了多线程，那么默认就会创建PTHREAD_POOL_SIZE个线程。这是WASM线程的总开关，native通过pthread_create创建的线程数目，不能超过这个数。

### pthread_create 是从real Thread Pool里面取得一个线程
参考例子https://developers.google.com/web/updates/2018/10/wasm-threads, 编译后，pthread_create(调用spawnThread)其实是从PThread.pthreads里面取出一个线程来实现的。
所以pthread_create其实是从PThread里面取一个现成的Worker：

```
function pthread_create(threadParams) {
  ...
  var pthread = PThread.pthreads[threadParams.pthread_ptr] = {
    worker: worker,
    stackBase: threadParams.stackBase,
    stackSize: threadParams.stackSize,
    allocatedOwnStack: threadParams.allocatedOwnStack,
    threadInfoStruct: threadParams.pthread_ptr
  };
  ...
  return 0
}

```

### pthreadpool_create是从real Thread Pool里面取得多个线程，创建fake Thread Pool
pthreadpool来自https://github.com/Maratyszcza/pthreadpool 。奇怪的是，在TFJS项目编译后，我并没有找到对应的js代码。不过，这不妨碍我们的分析,具体代码在：
https://github.com/Maratyszcza/pthreadpool/blob/master/src/pthreads.c#L230 。pthreadpool_create调用的其实是pthread_create。而前面分析已经告诉我们，pthread_create是用来从real Thread Pool里面取得一个Web Worker（线程）。
```
struct pthreadpool* pthreadpool_create(size_t threads_count) {
        ...
		/* Caller thread serves as worker #0. Thus, we create system threads starting with worker #1. */
		for (size_t tid = 1; tid < threads_count; tid++) {
			pthread_create(&threadpool->threads[tid].thread_object, NULL, &thread_main, &threadpool->threads[tid]);
		}
        ...
}
```

所以pthreadpool_create创建的thread pool，其实是通过pthread_create从library_pthread.js的PTHread里面取出若干个Web Worker。

由此可见，pthreadpool_create创建的线程池，其线程来自PThread创建好的WebWorker。而WebWorker的最大数目是PTHREAD_POOL_SIZE决定的。
因此pthreadpool_create的参数threads_count应该不大于PTHREAD_POOL_SIZE。

### 能否通过pthreadpool_create来设置fake Thread Pool的大小？
https://github.com/Maratyszcza/pthreadpool/blob/master/src/pthreads.c#L230 给出的函数接口是：
```
struct pthreadpool* pthreadpool_create(size_t threads_count);
```
threads_count决定了从real Thread Pool里面取出的线程的数目。所以通过调整threads_count，其实是可以实现TFJS真实使用的线程数目的控制的（不超过real Thread Pool）。

backend.cc(TFJS)通过pthreadpool_create创建了一个全局的fake Thread Pool（tfjs::backend::threadpool）。XNN则将所有的计算任务在这个fake Thread Pool之间分配。
```
pthreadpool *threadpool = pthreadpool_create(
    std::min(std::max(num_cores, min_num_threads), max_num_threads));
```



参考：
1. pthread_create怎么对应到创建WebWorker的native代码
```

// From: https://developers.google.com/web/updates/2018/10/wasm-threads
// emcc -O2 -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=2 -o test.js test.c
#include <pthread.h>
#include <stdio.h>

// Calculate Fibonacci numbers shared function
int fibonacci(int iterations) {
    int     val = 1;
    int     last = 0;

    if (iterations == 0) {
        return 0;
    }
    for (int i = 1; i < iterations; i++) {
        int     seq;

        seq = val + last;
        last = val;
        val = seq;
    }
    return val;
}
// Start function for the background thread
void *bg_func(void *arg) {
    int     *iter = (void *)arg;

    *iter = fibonacci(*iter);
    return arg;
}
// Foreground thread and main entry point
int main(int argc, char *argv[]) {
    int         fg_val = 54;
    int         bg_val = 42;
    pthread_t   bg_thread;

    // Create the background thread
    if (pthread_create(&bg_thread, NULL, bg_func, &bg_val)) {
        perror("Thread create failed");
        return 1;
    }
    // Calculate on the foreground thread
    fg_val = fibonacci(fg_val);
    // Wait for background thread to finish
    if (pthread_join(bg_thread, NULL)) {
        perror("Thread join failed");
        return 2;
    }
    // Show the result from background and foreground threads
    printf("Fib(42) is %d, Fib(6 * 9) is %d\n", bg_val, fg_val);

    return 0;
}

```

