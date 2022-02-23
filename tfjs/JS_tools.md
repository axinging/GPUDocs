** mulitine line regex
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

** Get logs from playwright console

```
let results = [];
let successIndex = 0;
let failIndex = 0;
let logEnd = false;

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


page.on('console', msg => {
        console.log(msg);
        let msgStr = ('' + msg.args()[0]).replace('JSHandle@', '');
        if (msgStr.startsWith('SUCCESS')) {
          successIndex++;
        } else if (msgStr.startsWith('FAILED')) {
          results[failIndex] = msgStr;
          failIndex++;
        } else if (msgStr.startsWith('Skipped')) {
          console.log("ennnnnnnnnnnnnnnn");
          logStatus.logEnd = true;
        } else {
          // Unsupported.
        }
      });

      page.on("pageerror", (err) => {
        console.log(err.message)
      });
 ```
      
      
