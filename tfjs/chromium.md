
## How to add log in chromium

### CMD:
out\Default\chrome.exe  --enable-logging=stderr --v=1 > log.txt 2>&1   http://localhost:8080/hello.html

Log is also available from: Sawbuck

### Blink:
```
#include <base/debug/stack_trace.h>
#include <base/logging.h>
LOG(INFO) << base::PlatformThread::GetName()<<","<< base::PlatformThread::CurrentId();
base::debug::StackTrace st;
st.Print();
```

### V8:
```
+++ b/src/builtins/builtins-console.cc
#include "src/base/debug/stack_trace.h"

printf("%s, %d, %d, %d\n",__func__,__LINE__,
       v8::internal::ThreadId::TryGetCurrent().ToInteger(), base::OS::GetCurrentThreadId());
```

### Dawn log thread into console:
```
char procID[10];
sprintf(procID, "%lu", ::GetCurrentThreadId());
device->EmitLog(WGPULoggingType_Info, procID);
```
