## mulitine line regex
```
  async function readFileAsync(url) {
    return await fs.readFile(url, "binary");
  }
  const strMatch = await readFileAsync('20220223102951.log');
  var matchReg = /predictbegin.*?predictend/gi;
  console.log(strMatch.match(matchReg));

  matchReg = /gpudatabegin.*?gpudataend/gi;
  console.log(strMatch.match(matchReg));
```

## Get logs from playwright console

```
'use strict';

const {chromium} = require('playwright');

let logStatus = {logEnd: false};

async function waitForCondition(condition) {
  return new Promise(resolve => {
    var start_time = Date.now();
    function checkCondition() {
      if (condition.logEnd == true) {
        console.log('Test end');
        resolve();
      } else if (Date.now() > start_time + 3600 * 1000) {
        console.log('Test time out');
        resolve();
      } else {
        setTimeout(checkCondition, 1000);
      }
    }
    checkCondition();
  });
}


const browserPath =
    `${process.env.LOCALAPPDATA}/Google/Chrome SxS/Application/chrome.exe`;
const userDataDir = `${process.env.LOCALAPPDATA}/Google/Chrome SxS/User Data`;
const browserArgs =
    `--disable-dawn-features=disallow_unsafe_apis  --enable-dawn-features=record_detailed_timing_in_trace_events,disable_timestamp_query_conversion --enable-unsafe-webgpu --enable-tracing=disabled-by-default-gpu.dawn  --trace-startup-file=tracing.json --trace-startup-format=json`;
const logFile = `consolelog.log`;

function log(info) {
  console.log(info);
  const fs = require('fs');
  fs.appendFileSync(logFile, String(info) + '\n');
}

async function startContext(exitCondition) {
  let context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath: browserPath,
    viewport: null,
    ignoreHTTPSErrors: true,
    args: browserArgs.split(' '),
  });
  let page = await context.newPage();

  page.on('console', async msg => {
    for (let i = 0; i < msg.args().length; ++i) {
      log(`[console] ${i}: ${await msg.args()[i].jsonValue()}`);
    }

    let msgStr = ('' + msg.args()[0]).replace('JSHandle@', '');
    if (msgStr.includes('gpudataend')) {
      exitCondition.logEnd = true;
    } else {
      // Unsupported.
    }
  });
  page.on('pageerror', (err) => {console.log(err.message)});
  return [context, page];
}

async function closeContext(context) {
  await context.close();
}

async function runBenchmark(url) {
  const [context, page] = await startContext(logStatus);
  await page.goto(url);
  await waitForCondition(logStatus);

  await closeContext(context);
}

const url = '';

(async function() {
  if (url == '') {
    throw 'URL is empty';
  }
  await runBenchmark(url);
})();

 ```
      
## Use expect.toBe outside jtest

```
        function expect(actualValue) {
          return {
            toBe(comparisonValue) {
              if (actualValue !== comparisonValue) {
                throw new Error(`${actualValue} is not equal to ${comparisonValue}`);
              }
            },
            toBeGreaterThan(comparisonValue) {
              if (actualValue <= comparisonValue) {
                throw new Error(`${actualValue} is not greater than ${comparisonValue}`);
            }
          }
        }
      }
```

