
## WebGPU overview

WebGPU status and samples:
https://github.com/gpuweb/gpuweb/wiki/Implementation-Status

WebGPU spec:
https://gpuweb.github.io/gpuweb/

TFJS WebGPU implementation:
https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-webgpu

## How to run TFJS WebGPU on MacBook

1. Install latest Google Chrome Canary, test WebGPU
After install the dmg file, it usually located(Attention to \ and space):
```
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary
```
Start the Chrome Canary(Find the right icon inside Applications), set chrome://flags/#enable-unsafe-webgpu

Test page:
https://austineng.github.io/webgpu-samples/hello_triangle.html

2. Test TFJS-WebGPU
```
export CHROME_BIN=/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary
git clone https://github.com/tensorflow/tfjs.git
cd tfjs/tfjs-backend-webgpu
yarn
yarn test
```
3. Posnet

Posnet also works, but need small fix: https://github.com/tensorflow/tfjs-models/tree/master/posenet

tfjs-models\posenet>cp -r ..\..\tfjs\tfjs-backend-webgpu\node_modules\@tensorflow\tfjs-core .\node_modules\@tensorflow\

Also you can try this [Posnet](https://nostalgic-ramanujan-cdbc05.netlify.com) model.

## How to run TFJS WebGPU on Windows

In case you came across any time out issues, try as below:

In file tfjs-backend-webgpu/src/benchmark_ops_test.ts:
```
 describeWebGPU('Ops benchmarks', () => {
       jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000000;

```
Also in karma.conf.js:
```
captureTimeout: 21000000,
browserDisconnectTolerance: 3,
browserDisconnectTimeout : 21000000,
browserNoActivityTimeout : 21000000,

```

```
chrome_webgpu: {
  base: 'Chrome',
  flags: ['--sand-box', '--enable-unsafe-webgpu'],
} 
```

## How to benchmark WebGL over WebGPU

Example CL: 
https://github.com/tensorflow/tfjs/pull/1843

#### Run benchmark on WebGPU

1. Add below case and rename benchmark_ops_test to benchmark_test
(rename is not necessary, ypu can also remove the exclude in package.json: --excludeTest='src/benchmark_ops_test.ts')

```
--- a/tfjs-backend-webgpu/src/benchmark_ops_test.ts
+++ b/tfjs-backend-webgpu/src/benchmark_ops_test.ts
@@ -125,4 +125,14 @@ describeWebGPU('Ops benchmarks', () => {
 
     await time(() => tf.conv2d(a, b, 1, 'same'));
   });
+
+  it('depthwiseconv2d', async () => {
+    const x = tf.randomNormal<tf.Rank.R4>([1, 128, 128, 1]);
+    const w = tf.tensor4d(
+        [0.303873, 0.229223, 0.144333, 0.803373],
+        [2, 2, 1, 1],
+    );
+
+    await time(() => tf.depthwiseConv2d(x, w, 1, 'valid'));
+  });
 });
 ```
Also you may need: 
```
--- a/tfjs-backend-webgpu/src/setup_test.ts
+++ b/tfjs-backend-webgpu/src/setup_test.ts
@@ -30,7 +30,7 @@ const env = jasmine.getEnv();
 const INCLUDE_LIST: string[] = [
   'matmul', 'add ', 'subtract ', 'mul ', 'conv2d', 'pad', 'pool', 'maxPool',
   'floor divide ', 'resizeBilinear', 'relu', 'transpose', 'concat', 'argmax',
-  'fromPixels'
+  'fromPixels', 'depthwise'
 ];
```

About why rename benchmark_ops_test to benchmark_test: karma config excludes benchmark_ops_test by default.

2. cd fjs-backend-webgpu & yarn & yarn test

#### Run benchmark on WebGL(WebGL 1,WebGL 2 and CPU)
1. Add test case under tfjs-core/src/ops/benchmark_ops_test.ts

```
import * as tf from '../index'
import {ALL_ENVS, describeWithFlags} from '../jasmine_util';

describeWithFlags('Ops benchmarks',ALL_ENVS, () => {
  // Performs `trials` trials, of `reps` repetitions each. At the end of each
  // trial, endTrial() is run (and included in the benchmark time). This
  // allows the cost of endTrial() to be amortized across the many iterations.
  // This is needed in particular because WebGPU readbacks are asynchronous
  // and therefore always incur latency. (Plus, in Chrome right now, readbacks
  // are very inefficient, making the problem way worse.) Readbacks could be
  // avoided by using fences, but we don't have a common abstraction over
  // WebGL and WebGPU fences at the moment.
  async function time(
      doRep: (r: number) => tf.Tensor[] | tf.Tensor,
      endTrial?: () => Promise<void>, disposeAfterEachTrial = false,
      trials = 50, reps = 1) {
    const times = [];

    let toDispose: tf.Tensor[] = [];
    const dispose = () => {
      for (const t of toDispose) {
        t.dispose();
      }
      toDispose = [];
    };

    const trial = async () => {
      let result;
      for (let r = 0; r < reps; ++r) {
        result = doRep(r);

        toDispose = toDispose.concat(Array.isArray(result) ? result : [result]);
      }

      if (endTrial != null) {
        await endTrial();
      } else {
        await (Array.isArray(result) ? result[0] : result).data();
      }
    };

    // Warm-up. Specifically, this pre-allocates enough memory for an entire
    // trial, ensuring that no allocations happen when timing a trial (if the
    // backend reuses allocations).
    await trial();
    dispose();

    for (let t = 0; t < trials; ++t) {
      const start = tf.util.now();
      await trial();
      times.push(tf.util.now() - start);
      if (disposeAfterEachTrial) {
        dispose();
      }
    }

    const mean = times.reduce((a, b) => a + b, 0) / trials;
    const min = Math.min(...times);
    const fmt = (n: number) => n.toFixed(3);
    console.log(tf.ENV.getNumber('WEBGL_VERSION'));
    console.log(tf.getBackend());
    console.log(`MMMean time: ${fmt(mean)} ms -> ${fmt(mean / reps)} / rep`);
    console.log(`MMMin time: ${fmt(min)} ms -> ${fmt(min / reps)} / rep`);
  }

  it('argMax', async () => {
    const n = 50;
    const doTest = async (axis: number) => {
      const tensors = new Array(n);
      const maxes = new Array(n);
      for (let i = 0; i < n; ++i) {
        tensors[i] = tf.randomNormal([100, 100, 100]);
      }

      await time(
          (r) => {
            maxes[r] = tf.argMax(tensors[r], axis);
            return [];
          },
          async () => {
            await maxes[maxes.length - 1].data();
            for (const t of maxes) {
              t.dispose();
            }
          });
    };

    await doTest(0);
    await doTest(1);
    await doTest(2);
  }, 60000);

  it('matMul', async () => {
    const a = tf.randomNormal([500, 500]);
    const b = tf.randomNormal([500, 500]);

    await time(() => tf.matMul(a, b));
  });

  it('add', async () => {
    const a = tf.randomNormal([1, 65, 65, 256]);
    const b = tf.randomNormal([1, 65, 65, 256]);

    await time(() => tf.add(a, b));
  });

  it('conv2d', async () => {
    const a = tf.randomNormal<tf.Rank.R4>([1, 128, 128, 4]);
    const b = tf.randomNormal<tf.Rank.R4>([25, 25, 4, 4]);

    await time(() => tf.conv2d(a, b, 1, 'same'));
  });

  it('depthwiseconv2d', async () => {
    const x = tf.randomNormal<tf.Rank.R4>([1, 128, 128, 1]);
    const w = tf.tensor4d(
        [0.303873, 0.229223, 0.144333, 0.803373],
        [2, 2, 1, 1],
    );

    await time(() => tf.depthwiseConv2d(x, w, 1, 'valid'));
  });
});
```

2. yarn& yarn test --grep=benchmark

## TFJS WebGL/CPU test case vs WebGPU test case

WebGL test case(https://github.com/axinging/tfjs/tree/master/tfjs-backend-webgl/src):
```
import * as tf from '@tensorflow/tfjs-core';
import {test_util} from '@tensorflow/tfjs-core';
import {ALL_ENVS, describeWithFlags} from '@tensorflow/tfjs-core/dist/jasmine_util';

const {expectArraysClose} = test_util;

describeWithFlags('addbroadcastadd', ALL_ENVS, () => {
  it('addbroadcastadd2da3 2D+2D broadcast each with 1 dim', async () => {
    const a = tf.tensor2d([1, 2, 5, 1, 2, 5], [2, 3]);
    const b = tf.tensor2d([7, 3], [2, 1]);
    const res = tf.add(a, b);
    console.log(await res.data());
    expect(res.shape).toEqual([2, 3]);
    expectArraysClose(await res.data(), [8, 9, 12, 4, 5, 8]);
  });
});
```

WebGPU test case(under https://github.com/axinging/tfjs/tree/master/tfjs-backend-webgpu/src):
```
import * as tf from '@tensorflow/tfjs-core';
import {describeWebGPU} from './test_util';

describeWebGPU('Ops benchmarks', () => {
```

Example diff for how to porting WebGL test case to WebGPU case:

```
//../../tfjs/tfjs-core/src/ops/compare_ops_test.ts
18,20c18,20
< import * as tf from '@tensorflow/tfjs-core';
< import {describeWebGPU} from './test_util';
< import {test_util} from '@tensorflow/tfjs-core';
---
> import * as tf from '../index';
> import {ALL_ENVS, describeWithFlags} from '../jasmine_util';
> import {expectArraysClose, expectArraysEqual} from '../test_util';
22,23c22
<
< describeWebGPU('equal', () => {
---
> describeWithFlags('equal', ALL_ENVS, () => {
28c27
<     test_util.expectArraysClose(await tf.equal(a, b).data(), [0, 0, 1]);
---
>     expectArraysClose(await tf.equal(a, b).data(), [0, 0, 1]);
32c31
<     test_util.expectArraysClose(await tf.equal(a, b).data(), [1, 1, 1]);
---
>     expectArraysClose(await tf.equal(a, b).data(), [1, 1, 1]);
36c35
```

## Handtracking
How to build:
```
tfjs-core wp$ yarn
tfjs-core wp$ yarn build-npm
tfjs-core wp$ yarn link

handtrack wp$ yarn link "@tensorflow/tfjs-core"

handtrack wp$ yarn link

demo wp$ yarn link "@tensorflow-models/handtrack"
demo wp$ yarn link "@tensorflow/tfjs-core"
```

How to build it with local tfjs-core:
```
tfjs\tfjs-core>yarn
tfjs\tfjs-core>yarn build-npm
tfjs\tfjs-core>yarn link

tfjs\tfjs-backend-webgpu>yarn
tfjs\tfjs-backend-webgpu>yarn build-npm
tfjs\tfjs-backend-webgpu>yarn link


tfjs-models\handtrack>yarn link "@tensorflow/tfjs-backend-webgpu"
tfjs-models\handtrack>yarn link "@tensorflow/tfjs-core"
tfjs-models\handtrack>yarn & yarn build &yarn link

tfjs-models\handtrack\demo>yarn link "@tensorflow-models/handtrack"
tfjs-models\handtrack\demo>yarn & yarn watch
```

## JS not update after yarn build

```
cd /Users/abc/def/webgpu/handtracking/tfjs/tfjs-converter 
yarn cache clean
yarn unlink "@tensorflow/tfjs-core"
yarn unlink "@tensorflow/tfjs-backend-webgpu"

yarn link "@tensorflow/tfjs-core"
yarn link "@tensorflow/tfjs-backend-webgpu"

yarn & yarn build
yarn & yarn build-npm
yarn unlink
yarn link

cd /Users/abc/def/webgpu/handtracking/tfjs-models/handtrack
yarn cache clean
yarn link "@tensorflow/tfjs-core"
yarn link "@tensorflow/tfjs-backend-webgpu"
yarn link "@tensorflow/tfjs-converter"

cd /Users/abc/def/webgpu/handtracking/tfjs-models/handtrack/demo
yarn unlink "@tensorflow/tfjs-core"
yarn unlink "@tensorflow/tfjs-backend-webgpu"
yarn unlink "@tensorflow/tfjs-converter"
yarn unlink "@tensorflow-models/handtrack"

yarn cache clean
yarn link "@tensorflow/tfjs-core"
yarn link "@tensorflow/tfjs-backend-webgpu"
yarn link "@tensorflow/tfjs-converter"
yarn link "@tensorflow-models/handtrack"
```


## How to contribute
1, Edit code, format with clang-format
2, run test: yarn test
3, checkout lint: yarn lint

In case local pass, but failed on Cloud,  joining the mailing list:  
https://groups.google.com/a/tensorflow.org/forum/?utm_medium=email&utm_source=footer#!forum/tfjs

https://github.com/tensorflow/tfjs/blob/master/CONTRIBUTING.md
