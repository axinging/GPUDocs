
## 线程池
本文通过WASM的编译选项PTHREAD_POOL_SIZE和pthreadpool_create来理解WASM的线程池的概念。

在TFJS wasm里面，有两个地方会涉及到线程池大小：
1. 在TFJS编译的时候，会通过PTHREAD_POOL_SIZE（编译选项传入）来指定线程池的大小, 并创建相应大小的线程池。
2. 与此同时，在wasm/backend.cc（https://github.com/tensorflow/tfjs/blob/master/tfjs-backend-wasm/src/cc/backend.cc#L65 ） 里面，pthreadpool_create也会创建一个线程池，这个线程池的大小可以通过一个thread_count的参数来指定。


两个线程池之间的关系是：
1. 编译选项PTHREAD_POOL_SIZE决定的是真正的Thread Pool，称作real Thread Pool，其实就是PTHREAD_POOL_SIZE个Web Worker。具体代码在https://github.com/emscripten-core/emscripten/blob/main/src/library_pthread.js 。
2. pthreadpool_create创建的POOL，其实是从real Thread Pool取出若干个线程，它应该是real Thread Pool的子集,称作sub Thread Pool。

所以要注意：在WASM平台，pthreadpool_create并不是创建线程池，而是从已经创建好的线程池里面取出若干线程而已。

两个线程池的大小关系是：
既然pthreadpool_create创建的线程池是从real Thread Pool里面取得的，所以其参数thread_count <= PTHREAD_POOL_SIZE.

下面是代码分析。
### real Thread Pool的创建（创建PTHREAD_POOL_SIZE个Web Worker）

编译选项PTHREAD_POOL_SIZE决定了创建了几个Web Worker （linkops： https://github.com/tensorflow/tfjs/pull/4957/files#diff-7b82359d52b7dc5160e130024cc2759216a1a0fc63769dad1c5d076a362bf6e1R62）

每个使用了PThread的程序会创建PThread对象。这个对象根据PTHREAD_POOL_SIZE的大小，创建一个PThread.unusedWorkers数组，成员是Web Worker。
要注意的是，每个使用了PThread的程序，都会被注入一段PThread相关的代码。而这段被注入的代码，其实是根据library_pthread.js来生成的。我们将library_pthread.js称作模板。
譬如library_pthread.js创建线程池的代码，是下面这个样子的：
```
#if PTHREAD_POOL_SIZE
      var pthreadPoolSize = {{{ PTHREAD_POOL_SIZE }}};
      // Start loading up the Worker pool, if requested.
      for (var i = 0; i < pthreadPoolSize; ++i) {
        PThread.allocateUnusedWorker(); //PThread.unusedWorkers.push(new Worker(pthreadMainJs))
      }
#endif
```
注意这是一段模板。并不是实际程序运行的代码。示例https://github.com/axinging/GPUDocs/blob/master/tfjs/thread_test.js#L933 ，生成的实际的代码是这样的：
```
  initMainThreadBlock: function() {
    var pthreadPoolSize = 2;
    for (var i = 0; i < pthreadPoolSize; ++i) {
      PThread.allocateUnusedWorker()
    }
  },
```
显然，类似if PTHREAD_POOL_SIZE这样的宏定义被去掉了。

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

### pthreadpool_create是从real Thread Pool里面取得多个线程，创建sub Thread Pool
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

### 能否通过pthreadpool_create来设置sub Thread Pool的大小？
https://github.com/Maratyszcza/pthreadpool/blob/master/src/pthreads.c#L230 给出的函数接口是：
```
struct pthreadpool* pthreadpool_create(size_t threads_count);
```
threads_count决定了从real Thread Pool里面取出的线程的数目。所以通过调整threads_count，其实是可以实现TFJS真实使用的线程数目的控制的（不超过real Thread Pool）。

backend.cc(TFJS)通过pthreadpool_create创建了一个全局的sub Thread Pool（tfjs::backend::threadpool）。XNN则将所有的计算任务在这个sub Thread Pool之间分配。
```
pthreadpool *threadpool = pthreadpool_create(
    std::min(std::max(num_cores, min_num_threads), max_num_threads));
```



参考：
1. pthread_create怎么对应到创建WebWorker的代码
https://github.com/axinging/GPUDocs/blob/master/tfjs/thread_test.c
https://github.com/axinging/GPUDocs/blob/master/tfjs/thread_test.js



## 线程池大小的计算
### EMSDK 提供编译选项PTHREAD_POOL_SIZE进行设置线程数目、emscripten_num_logical_cores获取线程数目
EMSDK 在PR https://github.com/emscripten-core/emscripten/pull/10263 里面加入了对编译选项PTHREAD_POOL_SIZE的支持，用以指定线程池里面创建的线程数目。

此外，EMSDK还定义了emscripten_num_logical_cores函数，这个函数和PTHREAD_POOL_SIZE的值是一样的。要注意的是：这个函数只能native访问，js不可以。还有，PTHREAD_POOL_SIZE只能在EMSDK里面使用，TFJS wasm里面没法使用。
位于：https://github.com/emscripten-core/emscripten/blob/main/src/library_pthread.js#L641 。
```
  emscripten_num_logical_cores: function() {
#if ENVIRONMENT_MAY_BE_NODE
    if (ENVIRONMENT_IS_NODE) return require('os').cpus().length;
#endif
    return navigator['hardwareConcurrency'];
  },
```

这是SDK提供的SET和GET。所以从原理上来说，针对EMSDK的情况，一旦编译选项确定，那么PThread创建的总的线程数目其实是不可以更改的。
但是，pthreadpool_create在这个机制上打开了一个洞，可以从PThread创建的总的线程即前文提到的real Thread Pool里面取出一部分线程，用来创建一个sub Thread Pool。
TFJS的WASM实现就是通过pthreadpool_create来实现这个sub Thread Pool。当然了，如果pthreadpool_create指定的线程数目，和PTHREAD_POOL_SIZE一样，那么sub Thread Pool其实就等同于real Thread Pool。本质上，pthreadpool_create其实是pthreadpool_get。

### TFJS WASM
TFJS 在PR https://github.com/tensorflow/tfjs/pull/4957 里面使用了这个编译选项：
```
linkopts = 
    "-s PTHREAD_POOL_SIZE=" + "'Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 1) / 2))'"
```
根据PR里面的解释，这个选项是必须的，否则会导致hang。

TFJS在通过threadpool_create创建线程池之前（backend.cc），使用了emscripten_num_logical_cores来获得线程池的数目。
https://github.com/tensorflow/tfjs/blob/master/tfjs-backend-wasm/src/cc/backend.cc#L58
```
#ifdef __EMSCRIPTEN_PTHREADS__
int num_cores = emscripten_num_logical_cores() / 2;
#else
int num_cores = 1;
#endif

int min_num_threads = 1;
int max_num_threads = 4;
pthreadpool *threadpool = pthreadpool_create(
    std::min(std::max(num_cores, min_num_threads), max_num_threads));
```

对比下这段代码和PTHREAD_POOL_SIZE（linkopts）指定的值，两者完全是一样的。


|Interface  | User  |
|------------------|----|
| THREAD_POOL_SIZE                | linkops|
| emscripten_num_logical_cores              | c/c++ |
| pthread_create               | c/c++ | 
| pthreadpool_create               | c/c++ | 
| PTHREAD_POOL_SIZE  |library_pthread.js(emsdk)|
