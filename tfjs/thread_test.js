var Module = typeof Module !== 'undefined' ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key]
  }
}
var arguments_ = [];
var thisProgram = './this.program';
var quit_ = function(status, toThrow) {
  throw toThrow
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
ENVIRONMENT_IS_NODE = typeof process === 'object' &&
    typeof process.versions === 'object' &&
    typeof process.versions.node === 'string';
ENVIRONMENT_IS_SHELL =
    !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_PTHREAD = Module['ENVIRONMENT_IS_PTHREAD'] || false;
var _scriptDir = typeof document !== 'undefined' && document.currentScript ?
    document.currentScript.src :
    undefined;
if (ENVIRONMENT_IS_WORKER) {
  _scriptDir = self.location.href
} else if (ENVIRONMENT_IS_NODE) {
  _scriptDir = __filename
}
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory)
  }
  return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require('path').dirname(scriptDirectory) + '/'
  } else {
    scriptDirectory = __dirname + '/'
  }
  read_ = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    return nodeFS['readFileSync'](filename, binary ? null : 'utf8')
  };
  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret)
    }
    assert(ret.buffer);
    return ret
  };
  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/')
  }
  arguments_ = process['argv'].slice(2);
  if (typeof module !== 'undefined') {
    module['exports'] = Module
  }
  process['on']('uncaughtException', function(ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex
    }
  });
  process['on']('unhandledRejection', abort);
  quit_ = function(status) {
    process['exit'](status)
  };
  Module['inspect'] = function() {
    return '[Emscripten Module object]'
  };
  var nodeWorkerThreads;
  try {
    nodeWorkerThreads = require('worker_threads')
  } catch (e) {
    console.error(
        'The "worker_threads" module is not supported in this node.js build - perhaps a newer version is needed?');
    throw e
  }
  global.Worker = nodeWorkerThreads.Worker
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      return read(f)
    }
  }
  readBinary = function readBinary(f) {
    var data;
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f))
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data
  };
  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments
  }
  if (typeof quit === 'function') {
    quit_ = function(status) {
      quit(status)
    }
  }
  if (typeof print !== 'undefined') {
    if (typeof console === 'undefined') console = {};
    console.log = print;
    console.warn = console.error =
        typeof printErr !== 'undefined' ? printErr : print
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href
  } else if (typeof document !== 'undefined' && document.currentScript) {
    scriptDirectory = document.currentScript.src
  }
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory =
        scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/') + 1)
  } else {
    scriptDirectory = ''
  }
  if (ENVIRONMENT_IS_NODE) {
    read_ = function shell_read(filename, binary) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      return nodeFS['readFileSync'](filename, binary ? null : 'utf8')
    };
    readBinary = function readBinary(filename) {
      var ret = read_(filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret)
      }
      assert(ret.buffer);
      return ret
    }
  } else {
    read_ = function(url) {
      var xhr = new XMLHttpRequest;
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function(url) {
        var xhr = new XMLHttpRequest;
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response)
      }
    }
    readAsync = function(url, onload, onerror) {
      var xhr = new XMLHttpRequest;
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function() {
        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
          onload(xhr.response);
          return
        }
        onerror()
      };
      xhr.onerror = onerror;
      xhr.send(null)
    }
  }
  setWindowTitle = function(title) {
    document.title = title
  }
} else {
}
if (ENVIRONMENT_IS_NODE) {
  if (typeof performance === 'undefined') {
    global.performance = require('perf_hooks').performance
  }
}
var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key]
  }
}
moduleOverrides = null;
if (Module['arguments']) arguments_ = Module['arguments'];
if (Module['thisProgram']) thisProgram = Module['thisProgram'];
if (Module['quit']) quit_ = Module['quit'];
var STACK_ALIGN = 16;
function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text)
  }
}
function convertJsFunctionToWasm(func, sig) {
  if (typeof WebAssembly.Function === 'function') {
    var typeNames = {'i': 'i32', 'j': 'i64', 'f': 'f32', 'd': 'f64'};
    var type = {
      parameters: [],
      results: sig[0] == 'v' ? [] : [typeNames[sig[0]]]
    };
    for (var i = 1; i < sig.length; ++i) {
      type.parameters.push(typeNames[sig[i]])
    }
    return new WebAssembly.Function(type, func)
  }
  var typeSection = [1, 0, 1, 96];
  var sigRet = sig.slice(0, 1);
  var sigParam = sig.slice(1);
  var typeCodes = {'i': 127, 'j': 126, 'f': 125, 'd': 124};
  typeSection.push(sigParam.length);
  for (var i = 0; i < sigParam.length; ++i) {
    typeSection.push(typeCodes[sigParam[i]])
  }
  if (sigRet == 'v') {
    typeSection.push(0)
  } else {
    typeSection = typeSection.concat([1, typeCodes[sigRet]])
  }
  typeSection[1] = typeSection.length - 2;
  var bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0].concat(
      typeSection, [2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0]));
  var module = new WebAssembly.Module(bytes);
  var instance = new WebAssembly.Instance(module, {'e': {'f': func}});
  var wrappedFunc = instance.exports['f'];
  return wrappedFunc
}
var freeTableIndexes = [];
var functionsInTableMap;
function getEmptyTableSlot() {
  if (freeTableIndexes.length) {
    return freeTableIndexes.pop()
  }
  try {
    wasmTable.grow(1)
  } catch (err) {
    if (!(err instanceof RangeError)) {
      throw err
    }
    throw 'Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.'
  }
  return wasmTable.length - 1
}
function addFunctionWasm(func, sig) {
  if (!functionsInTableMap) {
    functionsInTableMap = new WeakMap;
    for (var i = 0; i < wasmTable.length; i++) {
      var item = wasmTable.get(i);
      if (item) {
        functionsInTableMap.set(item, i)
      }
    }
  }
  if (functionsInTableMap.has(func)) {
    return functionsInTableMap.get(func)
  }
  var ret = getEmptyTableSlot();
  try {
    wasmTable.set(ret, func)
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err
    }
    var wrapped = convertJsFunctionToWasm(func, sig);
    wasmTable.set(ret, wrapped)
  }
  functionsInTableMap.set(func, ret);
  return ret
}
var tempRet0 = 0;
var setTempRet0 = function(value) {
  tempRet0 = value
};
var Atomics_load = Atomics.load;
var Atomics_store = Atomics.store;
var Atomics_compareExchange = Atomics.compareExchange;
var wasmBinary;
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
var noExitRuntime = Module['noExitRuntime'] || true;
if (typeof WebAssembly !== 'object') {
  abort('no native wasm support detected')
}
var wasmMemory;
var wasmModule;
var ABORT = false;
var EXITSTATUS;
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text)
  }
}
function getCFunc(ident) {
  var func = Module['_' + ident];
  assert(
      func,
      'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func
}
function ccall(ident, returnType, argTypes, args, opts) {
  var toC = {
    'string': function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len)
      }
      return ret
    },
    'array': function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret
    }
  };
  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret
  }
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i])
      } else {
        cArgs[i] = args[i]
      }
    }
  }
  var ret = func.apply(null, cArgs);
  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret
}
var ALLOC_STACK = 1;
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var str = '';
  while (!(idx >= endIdx)) {
    var u0 = heap[idx++];
    if (!u0) return str;
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue
    }
    var u1 = heap[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode((u0 & 31) << 6 | u1);
      continue
    }
    var u2 = heap[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = (u0 & 15) << 12 | u1 << 6 | u2
    } else {
      u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0)
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
    }
  }
  return str
}
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ''
}
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | u1 & 1023
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | u >> 6;
      heap[outIdx++] = 128 | u & 63
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | u >> 12;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | u >> 18;
      heap[outIdx++] = 128 | u >> 12 & 63;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343)
      u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
    if (u <= 127)
      ++len;
    else if (u <= 2047)
      len += 2;
    else if (u <= 65535)
      len += 3;
    else
      len += 4
  }
  return len
}
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret
}
function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer)
}
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[buffer++ >> 0] = str.charCodeAt(i)
  }
  if (!dontAddNull) HEAP8[buffer >> 0] = 0
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
if (ENVIRONMENT_IS_PTHREAD) {
  buffer = Module['buffer']
}
function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf)
}
var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216;
if (ENVIRONMENT_IS_PTHREAD) {
  wasmMemory = Module['wasmMemory'];
  buffer = Module['buffer']
} else {
  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory']
  } else {
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_MEMORY / 65536,
      'maximum': INITIAL_MEMORY / 65536,
      'shared': true
    });
    if (!(wasmMemory.buffer instanceof SharedArrayBuffer)) {
      err('requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag');
      if (ENVIRONMENT_IS_NODE) {
        console.log(
            '(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and also use a recent version)')
      }
      throw Error('bad memory')
    }
  }
}
if (wasmMemory) {
  buffer = wasmMemory.buffer
}
INITIAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
  if (ENVIRONMENT_IS_PTHREAD) return;
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function')
      Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPRERUN__)
}
function initRuntime() {
  runtimeInitialized = true;
  if (ENVIRONMENT_IS_PTHREAD) return;
  callRuntimeCallbacks(__ATINIT__)
}
function preMain() {
  if (ENVIRONMENT_IS_PTHREAD) return;
  callRuntimeCallbacks(__ATMAIN__)
}
function exitRuntime() {
  if (ENVIRONMENT_IS_PTHREAD) return;
  runtimeExited = true
}
function postRun() {
  if (ENVIRONMENT_IS_PTHREAD) return;
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function')
      Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb)
}
function addOnInit(cb) {
  __ATINIT__.unshift(cb)
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb)
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
  assert(
      !ENVIRONMENT_IS_PTHREAD,
      'addRunDependency cannot be used in a pthread worker');
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies)
  }
}
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies)
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback()
    }
  }
}
Module['preloadedImages'] = {};
Module['preloadedAudios'] = {};
function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what)
  }
  if (ENVIRONMENT_IS_PTHREAD)
    console.error('Pthread aborting at ' + (new Error).stack);
  what += '';
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  what = 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.';
  var e = new WebAssembly.RuntimeError(what);
  throw e
}
var dataURIPrefix = 'data:application/octet-stream;base64,';
function isDataURI(filename) {
  return filename.startsWith(dataURIPrefix)
}
function isFileURI(filename) {
  return filename.startsWith('file://')
}
var wasmBinaryFile = 'test.wasm';
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile)
}
function getBinary(file) {
  try {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary)
    }
    if (readBinary) {
      return readBinary(file)
    } else {
      throw 'both async and sync fetching of the wasm failed'
    }
  } catch (err) {
    abort(err)
  }
}
function getBinaryPromise() {
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch === 'function' && !isFileURI(wasmBinaryFile)) {
      return fetch(wasmBinaryFile, {credentials: 'same-origin'})
          .then(function(response) {
            if (!response['ok']) {
              throw 'failed to load wasm binary file at \'' + wasmBinaryFile +
                  '\''
            }
            return response['arrayBuffer']()
          })
          .catch(function() {
            return getBinary(wasmBinaryFile)
          })
    } else {
      if (readAsync) {
        return new Promise(function(resolve, reject) {
          readAsync(wasmBinaryFile, function(response) {
            resolve(new Uint8Array(response))
          }, reject)
        })
      }
    }
  }
  return Promise.resolve().then(function() {
    return getBinary(wasmBinaryFile)
  })
}
function createWasm() {
  var info = {'env': asmLibraryArg, 'wasi_snapshot_preview1': asmLibraryArg};
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module['asm'] = exports;
    wasmTable = Module['asm']['__indirect_function_table'];
    addOnInit(Module['asm']['__wasm_call_ctors']);
    PThread.tlsInitFunctions.push(Module['asm']['emscripten_tls_init']);
    wasmModule = module;
    if (!ENVIRONMENT_IS_PTHREAD) {
      var numWorkersToLoad = PThread.unusedWorkers.length;
      PThread.unusedWorkers.forEach(function(w) {
        PThread.loadWasmModuleToWorker(w, function() {
          if (!--numWorkersToLoad) removeRunDependency('wasm-instantiate')
        })
      })
    }
  }
  if (!ENVIRONMENT_IS_PTHREAD) {
    addRunDependency('wasm-instantiate')
  }
  function receiveInstantiationResult(result) {
    receiveInstance(result['instance'], result['module'])
  }
  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise()
        .then(function(binary) {
          var result = WebAssembly.instantiate(binary, info);
          return result
        })
        .then(receiver, function(reason) {
          err('failed to asynchronously prepare wasm: ' + reason);
          abort(reason)
        })
  }
  function instantiateAsync() {
    if (!wasmBinary && typeof WebAssembly.instantiateStreaming === 'function' &&
        !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) &&
        typeof fetch === 'function') {
      return fetch(wasmBinaryFile, {credentials: 'same-origin'})
          .then(function(response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(receiveInstantiationResult, function(reason) {
              err('wasm streaming compile failed: ' + reason);
              err('falling back to ArrayBuffer instantiation');
              return instantiateArrayBuffer(receiveInstantiationResult)
            })
          })
    } else {
      return instantiateArrayBuffer(receiveInstantiationResult)
    }
  }
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      return exports
    } catch (e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false
    }
  }
  instantiateAsync();
  return {}
}
var tempDouble;
var tempI64;
var ASM_CONSTS = {
  4232: function() {
    throw 'Canceled!'
  },
  4250: function($0, $1) {
    setTimeout(function() {
      __emscripten_do_dispatch_to_thread($0, $1)
    }, 0)
  }
};
function initPthreadsJS() {
  PThread.initRuntime()
}
function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback(Module);
      continue
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        wasmTable.get(func)()
      } else {
        wasmTable.get(func)(callback.arg)
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg)
    }
  }
}
function demangle(func) {
  return func
}
function demangleAll(text) {
  var regex = /\b_Z[\w\d_]+/g;
  return text.replace(regex, function(x) {
    var y = demangle(x);
    return x === y ? x : y + ' [' + x + ']'
  })
}
var ERRNO_CODES = {
  EPERM: 63,
  ENOENT: 44,
  ESRCH: 71,
  EINTR: 27,
  EIO: 29,
  ENXIO: 60,
  E2BIG: 1,
  ENOEXEC: 45,
  EBADF: 8,
  ECHILD: 12,
  EAGAIN: 6,
  EWOULDBLOCK: 6,
  ENOMEM: 48,
  EACCES: 2,
  EFAULT: 21,
  ENOTBLK: 105,
  EBUSY: 10,
  EEXIST: 20,
  EXDEV: 75,
  ENODEV: 43,
  ENOTDIR: 54,
  EISDIR: 31,
  EINVAL: 28,
  ENFILE: 41,
  EMFILE: 33,
  ENOTTY: 59,
  ETXTBSY: 74,
  EFBIG: 22,
  ENOSPC: 51,
  ESPIPE: 70,
  EROFS: 69,
  EMLINK: 34,
  EPIPE: 64,
  EDOM: 18,
  ERANGE: 68,
  ENOMSG: 49,
  EIDRM: 24,
  ECHRNG: 106,
  EL2NSYNC: 156,
  EL3HLT: 107,
  EL3RST: 108,
  ELNRNG: 109,
  EUNATCH: 110,
  ENOCSI: 111,
  EL2HLT: 112,
  EDEADLK: 16,
  ENOLCK: 46,
  EBADE: 113,
  EBADR: 114,
  EXFULL: 115,
  ENOANO: 104,
  EBADRQC: 103,
  EBADSLT: 102,
  EDEADLOCK: 16,
  EBFONT: 101,
  ENOSTR: 100,
  ENODATA: 116,
  ETIME: 117,
  ENOSR: 118,
  ENONET: 119,
  ENOPKG: 120,
  EREMOTE: 121,
  ENOLINK: 47,
  EADV: 122,
  ESRMNT: 123,
  ECOMM: 124,
  EPROTO: 65,
  EMULTIHOP: 36,
  EDOTDOT: 125,
  EBADMSG: 9,
  ENOTUNIQ: 126,
  EBADFD: 127,
  EREMCHG: 128,
  ELIBACC: 129,
  ELIBBAD: 130,
  ELIBSCN: 131,
  ELIBMAX: 132,
  ELIBEXEC: 133,
  ENOSYS: 52,
  ENOTEMPTY: 55,
  ENAMETOOLONG: 37,
  ELOOP: 32,
  EOPNOTSUPP: 138,
  EPFNOSUPPORT: 139,
  ECONNRESET: 15,
  ENOBUFS: 42,
  EAFNOSUPPORT: 5,
  EPROTOTYPE: 67,
  ENOTSOCK: 57,
  ENOPROTOOPT: 50,
  ESHUTDOWN: 140,
  ECONNREFUSED: 14,
  EADDRINUSE: 3,
  ECONNABORTED: 13,
  ENETUNREACH: 40,
  ENETDOWN: 38,
  ETIMEDOUT: 73,
  EHOSTDOWN: 142,
  EHOSTUNREACH: 23,
  EINPROGRESS: 26,
  EALREADY: 7,
  EDESTADDRREQ: 17,
  EMSGSIZE: 35,
  EPROTONOSUPPORT: 66,
  ESOCKTNOSUPPORT: 137,
  EADDRNOTAVAIL: 4,
  ENETRESET: 39,
  EISCONN: 30,
  ENOTCONN: 53,
  ETOOMANYREFS: 141,
  EUSERS: 136,
  EDQUOT: 19,
  ESTALE: 72,
  ENOTSUP: 138,
  ENOMEDIUM: 148,
  EILSEQ: 25,
  EOVERFLOW: 61,
  ECANCELED: 11,
  ENOTRECOVERABLE: 56,
  EOWNERDEAD: 62,
  ESTRPIPE: 135
};
function _emscripten_futex_wake(addr, count) {
  if (addr <= 0 || addr > HEAP8.length || addr & 3 != 0 || count < 0)
    return -28;
  if (count == 0) return 0;
  if (count >= 2147483647) count = Infinity;
  var mainThreadWaitAddress =
      Atomics.load(HEAP32, __emscripten_main_thread_futex >> 2);
  var mainThreadWoken = 0;
  if (mainThreadWaitAddress == addr) {
    var loadedAddr = Atomics.compareExchange(
        HEAP32, __emscripten_main_thread_futex >> 2, mainThreadWaitAddress, 0);
    if (loadedAddr == mainThreadWaitAddress) {
      --count;
      mainThreadWoken = 1;
      if (count <= 0) return 1
    }
  }
  var ret = Atomics.notify(HEAP32, addr >> 2, count);
  if (ret >= 0) return ret + mainThreadWoken;
  throw 'Atomics.notify returned an unexpected value ' + ret
}
Module['_emscripten_futex_wake'] = _emscripten_futex_wake;
function killThread(pthread_ptr) {
  if (ENVIRONMENT_IS_PTHREAD)
    throw 'Internal Error! killThread() can only ever be called from main application thread!';
  if (!pthread_ptr) throw 'Internal Error! Null pthread_ptr in killThread!';
  HEAP32[pthread_ptr + 12 >> 2] = 0;
  var pthread = PThread.pthreads[pthread_ptr];
  pthread.worker.terminate();
  PThread.freeThreadData(pthread);
  PThread.runningWorkers.splice(
      PThread.runningWorkers.indexOf(pthread.worker), 1);
  pthread.worker.pthread = undefined
}
function cancelThread(pthread_ptr) {
  if (ENVIRONMENT_IS_PTHREAD)
    throw 'Internal Error! cancelThread() can only ever be called from main application thread!';
  if (!pthread_ptr) throw 'Internal Error! Null pthread_ptr in cancelThread!';
  var pthread = PThread.pthreads[pthread_ptr];
  pthread.worker.postMessage({'cmd': 'cancel'})
}
function cleanupThread(pthread_ptr) {
  if (ENVIRONMENT_IS_PTHREAD)
    throw 'Internal Error! cleanupThread() can only ever be called from main application thread!';
  if (!pthread_ptr) throw 'Internal Error! Null pthread_ptr in cleanupThread!';
  var pthread = PThread.pthreads[pthread_ptr];
  if (pthread) {
    HEAP32[pthread_ptr + 12 >> 2] = 0;
    var worker = pthread.worker;
    PThread.returnWorkerToPool(worker)
  }
}
var PThread = {
  unusedWorkers: [],
  runningWorkers: [],
  tlsInitFunctions: [],
  initMainThreadBlock: function() {
    var pthreadPoolSize = 2;
    for (var i = 0; i < pthreadPoolSize; ++i) {
      PThread.allocateUnusedWorker()
    }
  },
  initRuntime: function() {
    var tb = _malloc(228);
    for (var i = 0; i < 228 / 4; ++i) HEAPU32[tb / 4 + i] = 0;
    HEAP32[tb + 12 >> 2] = tb;
    var headPtr = tb + 152;
    HEAP32[headPtr >> 2] = headPtr;
    var tlsMemory = _malloc(512);
    for (var i = 0; i < 128; ++i) HEAPU32[tlsMemory / 4 + i] = 0;
    Atomics.store(HEAPU32, tb + 100 >> 2, tlsMemory);
    Atomics.store(HEAPU32, tb + 40 >> 2, tb);
    __emscripten_thread_init(tb, !ENVIRONMENT_IS_WORKER, 1);
    _emscripten_register_main_browser_thread_id(tb)
  },
  initWorker: function() {},
  pthreads: {},
  threadExitHandlers: [],
  runExitHandlers: function() {
    while (PThread.threadExitHandlers.length > 0) {
      PThread.threadExitHandlers.pop()()
    }
    if (ENVIRONMENT_IS_PTHREAD && _pthread_self()) ___pthread_tsd_run_dtors()
  },
  runExitHandlersAndDeinitThread: function(tb, exitCode) {
    Atomics.store(HEAPU32, tb + 56 >> 2, 1);
    Atomics.store(HEAPU32, tb + 60 >> 2, 0);
    PThread.runExitHandlers();
    Atomics.store(HEAPU32, tb + 4 >> 2, exitCode);
    Atomics.store(HEAPU32, tb + 0 >> 2, 1);
    _emscripten_futex_wake(tb + 0, 2147483647);
    __emscripten_thread_init(0, 0, 0)
  },
  setExitStatus: function(status) {
    EXITSTATUS = status
  },
  threadExit: function(exitCode) {
    var tb = _pthread_self();
    if (tb) {
      PThread.runExitHandlersAndDeinitThread(tb, exitCode);
      if (ENVIRONMENT_IS_PTHREAD) {
        postMessage({'cmd': 'exit'})
      }
    }
  },
  threadCancel: function() {
    PThread.runExitHandlersAndDeinitThread(_pthread_self(), -1);
    postMessage({'cmd': 'cancelDone'})
  },
  terminateAllThreads: function() {
    for (var t in PThread.pthreads) {
      var pthread = PThread.pthreads[t];
      if (pthread && pthread.worker) {
        PThread.returnWorkerToPool(pthread.worker)
      }
    }
    PThread.pthreads = {};
    for (var i = 0; i < PThread.unusedWorkers.length; ++i) {
      var worker = PThread.unusedWorkers[i];
      worker.terminate()
    }
    PThread.unusedWorkers = [];
    for (var i = 0; i < PThread.runningWorkers.length; ++i) {
      var worker = PThread.runningWorkers[i];
      var pthread = worker.pthread;
      PThread.freeThreadData(pthread);
      worker.terminate()
    }
    PThread.runningWorkers = []
  },
  freeThreadData: function(pthread) {
    if (!pthread) return;
    if (pthread.threadInfoStruct) {
      var tlsMemory = HEAP32[pthread.threadInfoStruct + 100 >> 2];
      HEAP32[pthread.threadInfoStruct + 100 >> 2] = 0;
      _free(tlsMemory);
      _free(pthread.threadInfoStruct)
    }
    pthread.threadInfoStruct = 0;
    if (pthread.allocatedOwnStack && pthread.stackBase)
      _free(pthread.stackBase);
    pthread.stackBase = 0;
    if (pthread.worker) pthread.worker.pthread = null
  },
  returnWorkerToPool: function(worker) {
    PThread.runWithoutMainThreadQueuedCalls(function() {
      delete PThread.pthreads[worker.pthread.threadInfoStruct];
      PThread.unusedWorkers.push(worker);
      PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
      PThread.freeThreadData(worker.pthread);
      worker.pthread = undefined
    })
  },
  runWithoutMainThreadQueuedCalls: function(func) {
    HEAP32[__emscripten_allow_main_runtime_queued_calls >> 2] = 0;
    try {
      func()
    } finally {
      HEAP32[__emscripten_allow_main_runtime_queued_calls >> 2] = 1
    }
  },
  receiveObjectTransfer: function(data) {},
  threadInit: function() {
    for (var i in PThread.tlsInitFunctions) {
      PThread.tlsInitFunctions[i]()
    }
  },
  loadWasmModuleToWorker: function(worker, onFinishedLoading) {
    worker.onmessage = function(e) {
      var d = e['data'];
      var cmd = d['cmd'];
      if (worker.pthread)
        PThread.currentProxiedOperationCallerThread =
            worker.pthread.threadInfoStruct;
      if (d['targetThread'] && d['targetThread'] != _pthread_self()) {
        var thread = PThread.pthreads[d.targetThread];
        if (thread) {
          thread.worker.postMessage(e.data, d['transferList'])
        } else {
          console.error(
              'Internal error! Worker sent a message "' + cmd +
              '" to target pthread ' + d['targetThread'] +
              ', but that thread no longer exists!')
        }
        PThread.currentProxiedOperationCallerThread = undefined;
        return
      }
      if (cmd === 'processQueuedMainThreadWork') {
        _emscripten_main_thread_process_queued_calls()
      } else if (cmd === 'spawnThread') {
        spawnThread(e.data)
      } else if (cmd === 'cleanupThread') {
        cleanupThread(d['thread'])
      } else if (cmd === 'killThread') {
        killThread(d['thread'])
      } else if (cmd === 'cancelThread') {
        cancelThread(d['thread'])
      } else if (cmd === 'loaded') {
        worker.loaded = true;
        if (onFinishedLoading) onFinishedLoading(worker);
        if (worker.runPthread) {
          worker.runPthread();
          delete worker.runPthread
        }
      } else if (cmd === 'print') {
        out('Thread ' + d['threadId'] + ': ' + d['text'])
      } else if (cmd === 'printErr') {
        err('Thread ' + d['threadId'] + ': ' + d['text'])
      } else if (cmd === 'alert') {
        alert('Thread ' + d['threadId'] + ': ' + d['text'])
      } else if (cmd === 'exit') {
        var detached = worker.pthread &&
            Atomics.load(HEAPU32, worker.pthread.threadInfoStruct + 64 >> 2);
        if (detached) {
          PThread.returnWorkerToPool(worker)
        }
      } else if (cmd === 'exitProcess') {
        try {
          exit(d['returnCode'])
        } catch (e) {
          if (e instanceof ExitStatus) return;
          throw e
        }
      } else if (cmd === 'cancelDone') {
        PThread.returnWorkerToPool(worker)
      } else if (cmd === 'objectTransfer') {
        PThread.receiveObjectTransfer(e.data)
      } else if (e.data.target === 'setimmediate') {
        worker.postMessage(e.data)
      } else {
        err('worker sent an unknown command ' + cmd)
      }
      PThread.currentProxiedOperationCallerThread = undefined
    };
    worker.onerror = function(e) {
      err('pthread sent an error! ' + e.filename + ':' + e.lineno + ': ' +
          e.message)
    };
    if (ENVIRONMENT_IS_NODE) {
      worker.on('message', function(data) {
        worker.onmessage({data: data})
      });
      worker.on('error', function(data) {
        worker.onerror(data)
      });
      worker.on('exit', function(data) {})
    }
    worker.postMessage({
      'cmd': 'load',
      'urlOrBlob': Module['mainScriptUrlOrBlob'] || _scriptDir,
      'wasmMemory': wasmMemory,
      'wasmModule': wasmModule
    })
  },
  allocateUnusedWorker: function() {
    var pthreadMainJs = locateFile('test.worker.js');
    PThread.unusedWorkers.push(new Worker(pthreadMainJs))
  },
  getNewWorker: function() {
    if (PThread.unusedWorkers.length == 0) {
      PThread.allocateUnusedWorker();
      PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0])
    }
    return PThread.unusedWorkers.pop()
  },
  busySpinWait: function(msecs) {
    var t = performance.now() + msecs;
    while (performance.now() < t) {
    }
  }
};
function establishStackSpace(stackTop, stackMax) {
  _emscripten_stack_set_limits(stackTop, stackMax);
  stackRestore(stackTop)
}
Module['establishStackSpace'] = establishStackSpace;
function invokeEntryPoint(ptr, arg) {
  return wasmTable.get(ptr)(arg)
}
Module['invokeEntryPoint'] = invokeEntryPoint;
function jsStackTrace() {
  var error = new Error;
  if (!error.stack) {
    try {
      throw new Error
    } catch (e) {
      error = e
    }
    if (!error.stack) {
      return '(no stack trace available)'
    }
  }
  return error.stack.toString()
}
var runtimeKeepaliveCounter = 0;
function keepRuntimeAlive() {
  return noExitRuntime || runtimeKeepaliveCounter > 0
}
Module['keepRuntimeAlive'] = keepRuntimeAlive;
function ___assert_fail(condition, filename, line, func) {
  abort('Assertion failed: ' + UTF8ToString(condition) + ', at: ' + [
    filename ? UTF8ToString(filename) : 'unknown filename', line,
    func ? UTF8ToString(func) : 'unknown function'
  ])
}
var _emscripten_get_now;
if (ENVIRONMENT_IS_NODE) {
  _emscripten_get_now = function() {
    var t = process['hrtime']();
    return t[0] * 1e3 + t[1] / 1e6
  }
} else if (ENVIRONMENT_IS_PTHREAD) {
  _emscripten_get_now = function() {
    return performance.now() - Module['__performance_now_clock_drift']
  }
} else if (typeof dateNow !== 'undefined') {
  _emscripten_get_now = dateNow
} else
  _emscripten_get_now = function() {
    return performance.now()
  };
var _emscripten_get_now_is_monotonic = true;
function setErrNo(value) {
  HEAP32[___errno_location() >> 2] = value;
  return value
}
function _clock_gettime(clk_id, tp) {
  var now;
  if (clk_id === 0) {
    now = Date.now()
  } else if (
      (clk_id === 1 || clk_id === 4) && _emscripten_get_now_is_monotonic) {
    now = _emscripten_get_now()
  } else {
    setErrNo(28);
    return -1
  }
  HEAP32[tp >> 2] = now / 1e3 | 0;
  HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;
  return 0
}
function ___clock_gettime(a0, a1) {
  return _clock_gettime(a0, a1)
}
function _pthread_cleanup_push(routine, arg) {
  PThread.threadExitHandlers.push(function() {
    wasmTable.get(routine)(arg)
  })
}
function ___cxa_thread_atexit(a0, a1) {
  return _pthread_cleanup_push(a0, a1)
}
function __emscripten_notify_thread_queue(targetThreadId, mainThreadId) {
  if (targetThreadId == mainThreadId) {
    postMessage({'cmd': 'processQueuedMainThreadWork'})
  } else if (ENVIRONMENT_IS_PTHREAD) {
    postMessage({'targetThread': targetThreadId, 'cmd': 'processThreadQueue'})
  } else {
    var pthread = PThread.pthreads[targetThreadId];
    var worker = pthread && pthread.worker;
    if (!worker) {
      return
    }
    worker.postMessage({'cmd': 'processThreadQueue'})
  }
  return 1
}
var readAsmConstArgsArray = [];
function readAsmConstArgs(sigPtr, buf) {
  readAsmConstArgsArray.length = 0;
  var ch;
  buf >>= 2;
  while (ch = HEAPU8[sigPtr++]) {
    var double = ch < 105;
    if (double && buf & 1) buf++;
    readAsmConstArgsArray.push(double ? HEAPF64[buf++ >> 1] : HEAP32[buf]);
    ++buf
  }
  return readAsmConstArgsArray
}
function _emscripten_asm_const_int(code, sigPtr, argbuf) {
  var args = readAsmConstArgs(sigPtr, argbuf);
  return ASM_CONSTS[code].apply(null, args)
}
function _emscripten_conditional_set_current_thread_status(
    expectedStatus, newStatus) {}
function _emscripten_futex_wait(addr, val, timeout) {
  if (addr <= 0 || addr > HEAP8.length || addr & 3 != 0) return -28;
  if (!ENVIRONMENT_IS_WEB) {
    var ret = Atomics.wait(HEAP32, addr >> 2, val, timeout);
    if (ret === 'timed-out') return -73;
    if (ret === 'not-equal') return -6;
    if (ret === 'ok') return 0;
    throw 'Atomics.wait returned an unexpected value ' + ret
  } else {
    if (Atomics.load(HEAP32, addr >> 2) != val) {
      return -6
    }
    var tNow = performance.now();
    var tEnd = tNow + timeout;
    var lastAddr =
        Atomics.exchange(HEAP32, __emscripten_main_thread_futex >> 2, addr);
    while (1) {
      tNow = performance.now();
      if (tNow > tEnd) {
        lastAddr =
            Atomics.exchange(HEAP32, __emscripten_main_thread_futex >> 2, 0);
        return -73
      }
      lastAddr =
          Atomics.exchange(HEAP32, __emscripten_main_thread_futex >> 2, 0);
      if (lastAddr == 0) {
        break
      }
      _emscripten_main_thread_process_queued_calls();
      if (Atomics.load(HEAP32, addr >> 2) != val) {
        return -6
      }
      lastAddr =
          Atomics.exchange(HEAP32, __emscripten_main_thread_futex >> 2, addr)
    }
    return 0
  }
}
function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.copyWithin(dest, src, src + num)
}
function _emscripten_proxy_to_main_thread_js(index, sync) {
  var numCallArgs = arguments.length - 2;
  var stack = stackSave();
  var serializedNumCallArgs = numCallArgs;
  var args = stackAlloc(serializedNumCallArgs * 8);
  var b = args >> 3;
  for (var i = 0; i < numCallArgs; i++) {
    var arg = arguments[2 + i];
    HEAPF64[b + i] = arg
  }
  var ret = _emscripten_run_in_main_runtime_thread_js(
      index, serializedNumCallArgs, args, sync);
  stackRestore(stack);
  return ret
}
var _emscripten_receive_on_main_thread_js_callArgs = [];
function _emscripten_receive_on_main_thread_js(index, numCallArgs, args) {
  _emscripten_receive_on_main_thread_js_callArgs.length = numCallArgs;
  var b = args >> 3;
  for (var i = 0; i < numCallArgs; i++) {
    _emscripten_receive_on_main_thread_js_callArgs[i] = HEAPF64[b + i]
  }
  var isEmAsmConst = index < 0;
  var func =
      !isEmAsmConst ? proxiedFunctionTable[index] : ASM_CONSTS[-index - 1];
  return func.apply(null, _emscripten_receive_on_main_thread_js_callArgs)
}
function abortOnCannotGrowMemory(requestedSize) {
  abort('OOM')
}
function _emscripten_resize_heap(requestedSize) {
  var oldSize = HEAPU8.length;
  requestedSize = requestedSize >>> 0;
  abortOnCannotGrowMemory(requestedSize)
}
var JSEvents = {
  inEventHandler: 0,
  removeAllEventListeners: function() {
    for (var i = JSEvents.eventHandlers.length - 1; i >= 0; --i) {
      JSEvents._removeHandler(i)
    }
    JSEvents.eventHandlers = [];
    JSEvents.deferredCalls = []
  },
  registerRemoveEventListeners: function() {
    if (!JSEvents.removeEventListenersRegistered) {
      __ATEXIT__.push(JSEvents.removeAllEventListeners);
      JSEvents.removeEventListenersRegistered = true
    }
  },
  deferredCalls: [],
  deferCall: function(targetFunction, precedence, argsList) {
    function arraysHaveEqualContent(arrA, arrB) {
      if (arrA.length != arrB.length) return false;
      for (var i in arrA) {
        if (arrA[i] != arrB[i]) return false
      }
      return true
    }
    for (var i in JSEvents.deferredCalls) {
      var call = JSEvents.deferredCalls[i];
      if (call.targetFunction == targetFunction &&
          arraysHaveEqualContent(call.argsList, argsList)) {
        return
      }
    }
    JSEvents.deferredCalls.push({
      targetFunction: targetFunction,
      precedence: precedence,
      argsList: argsList
    });
    JSEvents.deferredCalls.sort(function(x, y) {
      return x.precedence < y.precedence
    })
  },
  removeDeferredCalls: function(targetFunction) {
    for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
      if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
        JSEvents.deferredCalls.splice(i, 1);
        --i
      }
    }
  },
  canPerformEventHandlerRequests: function() {
    return JSEvents.inEventHandler &&
        JSEvents.currentEventHandler.allowsDeferredCalls
  },
  runDeferredCalls: function() {
    if (!JSEvents.canPerformEventHandlerRequests()) {
      return
    }
    for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
      var call = JSEvents.deferredCalls[i];
      JSEvents.deferredCalls.splice(i, 1);
      --i;
      call.targetFunction.apply(null, call.argsList)
    }
  },
  eventHandlers: [],
  removeAllHandlersOnTarget: function(target, eventTypeString) {
    for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
      if (JSEvents.eventHandlers[i].target == target &&
          (!eventTypeString ||
           eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
        JSEvents._removeHandler(i--)
      }
    }
  },
  _removeHandler: function(i) {
    var h = JSEvents.eventHandlers[i];
    h.target.removeEventListener(
        h.eventTypeString, h.eventListenerFunc, h.useCapture);
    JSEvents.eventHandlers.splice(i, 1)
  },
  registerOrRemoveHandler: function(eventHandler) {
    var jsEventHandler = function jsEventHandler(event) {
      ++JSEvents.inEventHandler;
      JSEvents.currentEventHandler = eventHandler;
      JSEvents.runDeferredCalls();
      eventHandler.handlerFunc(event);
      JSEvents.runDeferredCalls();
      --JSEvents.inEventHandler
    };
    if (eventHandler.callbackfunc) {
      eventHandler.eventListenerFunc = jsEventHandler;
      eventHandler.target.addEventListener(
          eventHandler.eventTypeString, jsEventHandler,
          eventHandler.useCapture);
      JSEvents.eventHandlers.push(eventHandler);
      JSEvents.registerRemoveEventListeners()
    } else {
      for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
        if (JSEvents.eventHandlers[i].target == eventHandler.target &&
            JSEvents.eventHandlers[i].eventTypeString ==
                eventHandler.eventTypeString) {
          JSEvents._removeHandler(i--)
        }
      }
    }
  },
  queueEventHandlerOnThread_iiii: function(
      targetThread, eventHandlerFunc, eventTypeId, eventData, userData) {
    var stackTop = stackSave();
    var varargs = stackAlloc(12);
    HEAP32[varargs >> 2] = eventTypeId;
    HEAP32[varargs + 4 >> 2] = eventData;
    HEAP32[varargs + 8 >> 2] = userData;
    __emscripten_call_on_thread(
        0, targetThread, 637534208, eventHandlerFunc, eventData, varargs);
    stackRestore(stackTop)
  },
  getTargetThreadForEventCallback: function(targetThread) {
    switch (targetThread) {
      case 1:
        return 0;
      case 2:
        return PThread.currentProxiedOperationCallerThread;
      default:
        return targetThread
    }
  },
  getNodeNameForTarget: function(target) {
    if (!target) return '';
    if (target == window) return '#window';
    if (target == screen) return '#screen';
    return target && target.nodeName ? target.nodeName : ''
  },
  fullscreenEnabled: function() {
    return document.fullscreenEnabled || document.webkitFullscreenEnabled
  }
};
function stringToNewUTF8(jsString) {
  var length = lengthBytesUTF8(jsString) + 1;
  var cString = _malloc(length);
  stringToUTF8(jsString, cString, length);
  return cString
}
function _emscripten_set_offscreencanvas_size_on_target_thread_js(
    targetThread, targetCanvas, width, height) {
  var stackTop = stackSave();
  var varargs = stackAlloc(12);
  var targetCanvasPtr = 0;
  if (targetCanvas) {
    targetCanvasPtr = stringToNewUTF8(targetCanvas)
  }
  HEAP32[varargs >> 2] = targetCanvasPtr;
  HEAP32[varargs + 4 >> 2] = width;
  HEAP32[varargs + 8 >> 2] = height;
  __emscripten_call_on_thread(
      0, targetThread, 657457152, 0, targetCanvasPtr, varargs);
  stackRestore(stackTop)
}
function _emscripten_set_offscreencanvas_size_on_target_thread(
    targetThread, targetCanvas, width, height) {
  targetCanvas = targetCanvas ? UTF8ToString(targetCanvas) : '';
  _emscripten_set_offscreencanvas_size_on_target_thread_js(
      targetThread, targetCanvas, width, height)
}
function maybeCStringToJsString(cString) {
  return cString > 2 ? UTF8ToString(cString) : cString
}
var specialHTMLTargets = [
  0, typeof document !== 'undefined' ? document : 0,
  typeof window !== 'undefined' ? window : 0
];
function findEventTarget(target) {
  target = maybeCStringToJsString(target);
  var domElement = specialHTMLTargets[target] ||
      (typeof document !== 'undefined' ? document.querySelector(target) :
                                         undefined);
  return domElement
}
function findCanvasEventTarget(target) {
  return findEventTarget(target)
}
function _emscripten_set_canvas_element_size_calling_thread(
    target, width, height) {
  var canvas = findCanvasEventTarget(target);
  if (!canvas) return -4;
  if (canvas.canvasSharedPtr) {
    HEAP32[canvas.canvasSharedPtr >> 2] = width;
    HEAP32[canvas.canvasSharedPtr + 4 >> 2] = height
  }
  if (canvas.offscreenCanvas || !canvas.controlTransferredOffscreen) {
    if (canvas.offscreenCanvas) canvas = canvas.offscreenCanvas;
    var autoResizeViewport = false;
    if (canvas.GLctxObject && canvas.GLctxObject.GLctx) {
      var prevViewport = canvas.GLctxObject.GLctx.getParameter(2978);
      autoResizeViewport = prevViewport[0] === 0 && prevViewport[1] === 0 &&
          prevViewport[2] === canvas.width && prevViewport[3] === canvas.height
    }
    canvas.width = width;
    canvas.height = height;
    if (autoResizeViewport) {
      canvas.GLctxObject.GLctx.viewport(0, 0, width, height)
    }
  } else if (canvas.canvasSharedPtr) {
    var targetThread = HEAP32[canvas.canvasSharedPtr + 8 >> 2];
    _emscripten_set_offscreencanvas_size_on_target_thread(
        targetThread, target, width, height);
    return 1
  } else {
    return -4
  }
  return 0
}
function _emscripten_set_canvas_element_size_main_thread(
    target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD)
    return _emscripten_proxy_to_main_thread_js(1, 1, target, width, height);
  return _emscripten_set_canvas_element_size_calling_thread(
      target, width, height)
}
function _emscripten_set_canvas_element_size(target, width, height) {
  var canvas = findCanvasEventTarget(target);
  if (canvas) {
    return _emscripten_set_canvas_element_size_calling_thread(
        target, width, height)
  } else {
    return _emscripten_set_canvas_element_size_main_thread(
        target, width, height)
  }
}
function _emscripten_set_current_thread_status(newStatus) {}
function __webgl_enable_ANGLE_instanced_arrays(ctx) {
  var ext = ctx.getExtension('ANGLE_instanced_arrays');
  if (ext) {
    ctx['vertexAttribDivisor'] = function(index, divisor) {
      ext['vertexAttribDivisorANGLE'](index, divisor)
    };
    ctx['drawArraysInstanced'] = function(mode, first, count, primcount) {
      ext['drawArraysInstancedANGLE'](mode, first, count, primcount)
    };
    ctx['drawElementsInstanced'] = function(
        mode, count, type, indices, primcount) {
      ext['drawElementsInstancedANGLE'](mode, count, type, indices, primcount)
    };
    return 1
  }
}
function __webgl_enable_OES_vertex_array_object(ctx) {
  var ext = ctx.getExtension('OES_vertex_array_object');
  if (ext) {
    ctx['createVertexArray'] = function() {
      return ext['createVertexArrayOES']()
    };
    ctx['deleteVertexArray'] = function(vao) {
      ext['deleteVertexArrayOES'](vao)
    };
    ctx['bindVertexArray'] = function(vao) {
      ext['bindVertexArrayOES'](vao)
    };
    ctx['isVertexArray'] = function(vao) {
      return ext['isVertexArrayOES'](vao)
    };
    return 1
  }
}
function __webgl_enable_WEBGL_draw_buffers(ctx) {
  var ext = ctx.getExtension('WEBGL_draw_buffers');
  if (ext) {
    ctx['drawBuffers'] = function(n, bufs) {
      ext['drawBuffersWEBGL'](n, bufs)
    };
    return 1
  }
}
function __webgl_enable_WEBGL_multi_draw(ctx) {
  return !!(ctx.multiDrawWebgl = ctx.getExtension('WEBGL_multi_draw'))
}
var GL = {
  counter: 1,
  buffers: [],
  programs: [],
  framebuffers: [],
  renderbuffers: [],
  textures: [],
  shaders: [],
  vaos: [],
  contexts: {},
  offscreenCanvases: {},
  queries: [],
  stringCache: {},
  unpackAlignment: 4,
  recordError: function recordError(errorCode) {
    if (!GL.lastError) {
      GL.lastError = errorCode
    }
  },
  getNewId: function(table) {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {
      table[i] = null
    }
    return ret
  },
  getSource: function(shader, count, string, length) {
    var source = '';
    for (var i = 0; i < count; ++i) {
      var len = length ? HEAP32[length + i * 4 >> 2] : -1;
      source +=
          UTF8ToString(HEAP32[string + i * 4 >> 2], len < 0 ? undefined : len)
    }
    return source
  },
  createContext: function(canvas, webGLContextAttributes) {
    if (!canvas.getContextSafariWebGL2Fixed) {
      canvas.getContextSafariWebGL2Fixed = canvas.getContext;
      canvas.getContext = function(ver, attrs) {
        var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
        return ver == 'webgl' == gl instanceof WebGLRenderingContext ? gl : null
      }
    }
    var ctx = canvas.getContext('webgl', webGLContextAttributes);
    if (!ctx) return 0;
    var handle = GL.registerContext(ctx, webGLContextAttributes);
    return handle
  },
  registerContext: function(ctx, webGLContextAttributes) {
    var handle = _malloc(8);
    HEAP32[handle + 4 >> 2] = _pthread_self();
    var context = {
      handle: handle,
      attributes: webGLContextAttributes,
      version: webGLContextAttributes.majorVersion,
      GLctx: ctx
    };
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (typeof webGLContextAttributes.enableExtensionsByDefault ===
            'undefined' ||
        webGLContextAttributes.enableExtensionsByDefault) {
      GL.initExtensions(context)
    }
    return handle
  },
  makeContextCurrent: function(contextHandle) {
    GL.currentContext = GL.contexts[contextHandle];
    Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
    return !(contextHandle && !GLctx)
  },
  getContext: function(contextHandle) {
    return GL.contexts[contextHandle]
  },
  deleteContext: function(contextHandle) {
    if (GL.currentContext === GL.contexts[contextHandle])
      GL.currentContext = null;
    if (typeof JSEvents === 'object')
      JSEvents.removeAllHandlersOnTarget(
          GL.contexts[contextHandle].GLctx.canvas);
    if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas)
      GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
    _free(GL.contexts[contextHandle].handle);
    GL.contexts[contextHandle] = null
  },
  initExtensions: function(context) {
    if (!context) context = GL.currentContext;
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx = context.GLctx;
    __webgl_enable_ANGLE_instanced_arrays(GLctx);
    __webgl_enable_OES_vertex_array_object(GLctx);
    __webgl_enable_WEBGL_draw_buffers(GLctx);
    {GLctx.disjointTimerQueryExt = GLctx.getExtension(
         'EXT_disjoint_timer_query')} __webgl_enable_WEBGL_multi_draw(GLctx);
    var exts = GLctx.getSupportedExtensions() || [];
    exts.forEach(function(ext) {
      if (!ext.includes('lose_context') && !ext.includes('debug')) {
        GLctx.getExtension(ext)
      }
    })
  }
};
var __emscripten_webgl_power_preferences =
    ['default', 'low-power', 'high-performance'];
function _emscripten_webgl_do_create_context(target, attributes) {
  var a = attributes >> 2;
  var powerPreference = HEAP32[a + (24 >> 2)];
  var contextAttributes = {
    'alpha': !!HEAP32[a + (0 >> 2)],
    'depth': !!HEAP32[a + (4 >> 2)],
    'stencil': !!HEAP32[a + (8 >> 2)],
    'antialias': !!HEAP32[a + (12 >> 2)],
    'premultipliedAlpha': !!HEAP32[a + (16 >> 2)],
    'preserveDrawingBuffer': !!HEAP32[a + (20 >> 2)],
    'powerPreference': __emscripten_webgl_power_preferences[powerPreference],
    'failIfMajorPerformanceCaveat': !!HEAP32[a + (28 >> 2)],
    majorVersion: HEAP32[a + (32 >> 2)],
    minorVersion: HEAP32[a + (36 >> 2)],
    enableExtensionsByDefault: HEAP32[a + (40 >> 2)],
    explicitSwapControl: HEAP32[a + (44 >> 2)],
    proxyContextToMainThread: HEAP32[a + (48 >> 2)],
    renderViaOffscreenBackBuffer: HEAP32[a + (52 >> 2)]
  };
  var canvas = findCanvasEventTarget(target);
  if (!canvas) {
    return 0
  }
  if (contextAttributes.explicitSwapControl) {
    return 0
  }
  var contextHandle = GL.createContext(canvas, contextAttributes);
  return contextHandle
}
function _emscripten_webgl_create_context(a0, a1) {
  return _emscripten_webgl_do_create_context(a0, a1)
}
var SYSCALLS = {
  mappings: {},
  buffers: [null, [], []],
  printChar: function(stream, curr) {
    var buffer = SYSCALLS.buffers[stream];
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
      buffer.length = 0
    } else {
      buffer.push(curr)
    }
  },
  varargs: undefined,
  get: function() {
    SYSCALLS.varargs += 4;
    var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
    return ret
  },
  getStr: function(ptr) {
    var ret = UTF8ToString(ptr);
    return ret
  },
  get64: function(low, high) {
    return low
  }
};
function _fd_close(fd) {
  if (ENVIRONMENT_IS_PTHREAD)
    return _emscripten_proxy_to_main_thread_js(2, 1, fd);
  return 0
}
function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
  if (ENVIRONMENT_IS_PTHREAD)
    return _emscripten_proxy_to_main_thread_js(
        3, 1, fd, offset_low, offset_high, whence, newOffset)
}
function _fd_write(fd, iov, iovcnt, pnum) {
  if (ENVIRONMENT_IS_PTHREAD)
    return _emscripten_proxy_to_main_thread_js(4, 1, fd, iov, iovcnt, pnum);
  var num = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAP32[iov + i * 8 >> 2];
    var len = HEAP32[iov + (i * 8 + 4) >> 2];
    for (var j = 0; j < len; j++) {
      SYSCALLS.printChar(fd, HEAPU8[ptr + j])
    }
    num += len
  }
  HEAP32[pnum >> 2] = num;
  return 0
}
function spawnThread(threadParams) {
  if (ENVIRONMENT_IS_PTHREAD)
    throw 'Internal Error! spawnThread() can only ever be called from main application thread!';
  var worker = PThread.getNewWorker();
  if (!worker) {
    return 6
  }
  if (worker.pthread !== undefined) throw 'Internal error!';
  if (!threadParams.pthread_ptr) throw 'Internal error, no pthread ptr!';
  PThread.runningWorkers.push(worker);
  var tlsMemory = _malloc(128 * 4);
  for (var i = 0; i < 128; ++i) {
    HEAP32[tlsMemory + i * 4 >> 2] = 0
  }
  var stackHigh = threadParams.stackBase + threadParams.stackSize;
  var pthread = PThread.pthreads[threadParams.pthread_ptr] = {
    worker: worker,
    stackBase: threadParams.stackBase,
    stackSize: threadParams.stackSize,
    allocatedOwnStack: threadParams.allocatedOwnStack,
    threadInfoStruct: threadParams.pthread_ptr
  };
  var tis = pthread.threadInfoStruct >> 2;
  Atomics.store(HEAPU32, tis + (64 >> 2), threadParams.detached);
  Atomics.store(HEAPU32, tis + (100 >> 2), tlsMemory);
  Atomics.store(HEAPU32, tis + (40 >> 2), pthread.threadInfoStruct);
  Atomics.store(HEAPU32, tis + (80 >> 2), threadParams.stackSize);
  Atomics.store(HEAPU32, tis + (76 >> 2), stackHigh);
  Atomics.store(HEAPU32, tis + (104 >> 2), threadParams.stackSize);
  Atomics.store(HEAPU32, tis + (104 + 8 >> 2), stackHigh);
  Atomics.store(HEAPU32, tis + (104 + 12 >> 2), threadParams.detached);
  var global_libc = _emscripten_get_global_libc();
  var global_locale = global_libc + 40;
  Atomics.store(HEAPU32, tis + (172 >> 2), global_locale);
  worker.pthread = pthread;
  var msg = {
    'cmd': 'run',
    'start_routine': threadParams.startRoutine,
    'arg': threadParams.arg,
    'threadInfoStruct': threadParams.pthread_ptr,
    'stackBase': threadParams.stackBase,
    'stackSize': threadParams.stackSize
  };
  worker.runPthread = function() {
    msg.time = performance.now();
    worker.postMessage(msg, threadParams.transferList)
  };
  if (worker.loaded) {
    worker.runPthread();
    delete worker.runPthread
  }
  return 0
}
function _pthread_create(pthread_ptr, attr, start_routine, arg) {
  if (typeof SharedArrayBuffer === 'undefined') {
    err('Current environment does not support SharedArrayBuffer, pthreads are not available!');
    return 6
  }
  if (!pthread_ptr) {
    err('pthread_create called with a null thread pointer!');
    return 28
  }
  var transferList = [];
  var error = 0;
  if (ENVIRONMENT_IS_PTHREAD && (transferList.length === 0 || error)) {
    return _emscripten_sync_run_in_main_thread_4(
        687865856, pthread_ptr, attr, start_routine, arg)
  }
  if (error) return error;
  var stackSize = 0;
  var stackBase = 0;
  var detached = 0;
  if (attr && attr != -1) {
    stackSize = HEAP32[attr >> 2];
    stackSize += 81920;
    stackBase = HEAP32[attr + 8 >> 2];
    detached = HEAP32[attr + 12 >> 2] !== 0
  } else {
    stackSize = 2097152
  }
  var allocatedOwnStack = stackBase == 0;
  if (allocatedOwnStack) {
    stackBase = _memalign(16, stackSize)
  } else {
    stackBase -= stackSize;
    assert(stackBase > 0)
  }
  var threadInfoStruct = _malloc(228);
  for (var i = 0; i<228>> 2; ++i) HEAPU32[(threadInfoStruct >> 2) + i] = 0;
  HEAP32[pthread_ptr >> 2] = threadInfoStruct;
  HEAP32[threadInfoStruct + 12 >> 2] = threadInfoStruct;
  var headPtr = threadInfoStruct + 152;
  HEAP32[headPtr >> 2] = headPtr;
  var threadParams = {
    stackBase: stackBase,
    stackSize: stackSize,
    allocatedOwnStack: allocatedOwnStack,
    detached: detached,
    startRoutine: start_routine,
    pthread_ptr: threadInfoStruct,
    arg: arg,
    transferList: transferList
  };
  if (ENVIRONMENT_IS_PTHREAD) {
    threadParams.cmd = 'spawnThread';
    postMessage(threadParams, transferList);
    return 0
  }
  return spawnThread(threadParams)
}
function __pthread_testcancel_js() {
  if (!ENVIRONMENT_IS_PTHREAD) return;
  var tb = _pthread_self();
  if (!tb) return;
  var cancelDisabled = Atomics.load(HEAPU32, tb + 56 >> 2);
  if (cancelDisabled) return;
  var canceled = Atomics.load(HEAPU32, tb + 0 >> 2);
  if (canceled == 2) throw 'Canceled!'
}
function _emscripten_check_blocking_allowed() {
  if (ENVIRONMENT_IS_NODE) return;
  if (ENVIRONMENT_IS_WORKER) return;
  warnOnce(
      'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread')
}
function __emscripten_do_pthread_join(thread, status, block) {
  if (!thread) {
    err('pthread_join attempted on a null thread pointer!');
    return ERRNO_CODES.ESRCH
  }
  if (ENVIRONMENT_IS_PTHREAD && _pthread_self() == thread) {
    err('PThread ' + thread + ' is attempting to join to itself!');
    return ERRNO_CODES.EDEADLK
  } else if (
      !ENVIRONMENT_IS_PTHREAD &&
      _emscripten_main_browser_thread_id() == thread) {
    err('Main thread ' + thread + ' is attempting to join to itself!');
    return ERRNO_CODES.EDEADLK
  }
  var self = HEAP32[thread + 12 >> 2];
  if (self !== thread) {
    err('pthread_join attempted on thread ' + thread +
        ', which does not point to a valid thread, or does not exist anymore!');
    return ERRNO_CODES.ESRCH
  }
  var detached = Atomics.load(HEAPU32, thread + 64 >> 2);
  if (detached) {
    err('Attempted to join thread ' + thread + ', which was already detached!');
    return ERRNO_CODES.EINVAL
  }
  if (block) {
    _emscripten_check_blocking_allowed()
  }
  for (;;) {
    var threadStatus = Atomics.load(HEAPU32, thread + 0 >> 2);
    if (threadStatus == 1) {
      var threadExitCode = Atomics.load(HEAPU32, thread + 4 >> 2);
      if (status) HEAP32[status >> 2] = threadExitCode;
      Atomics.store(HEAPU32, thread + 64 >> 2, 1);
      if (!ENVIRONMENT_IS_PTHREAD)
        cleanupThread(thread);
      else
        postMessage({'cmd': 'cleanupThread', 'thread': thread});
      return 0
    }
    if (!block) {
      return ERRNO_CODES.EBUSY
    }
    __pthread_testcancel_js();
    if (!ENVIRONMENT_IS_PTHREAD) _emscripten_main_thread_process_queued_calls();
    _emscripten_futex_wait(
        thread + 0, threadStatus, ENVIRONMENT_IS_PTHREAD ? 100 : 1)
  }
}
function _pthread_join(thread, status) {
  return __emscripten_do_pthread_join(thread, status, true)
}
function _setTempRet0(val) {
  setTempRet0(val)
}
if (!ENVIRONMENT_IS_PTHREAD) PThread.initMainThreadBlock();
var GLctx;
var proxiedFunctionTable = [
  null, _emscripten_set_canvas_element_size_main_thread, _fd_close, _fd_seek,
  _fd_write
];
var ASSERTIONS = false;
var asmLibraryArg = {
  '__assert_fail': ___assert_fail,
  '__clock_gettime': ___clock_gettime,
  '__cxa_thread_atexit': ___cxa_thread_atexit,
  '_emscripten_notify_thread_queue': __emscripten_notify_thread_queue,
  'emscripten_asm_const_int': _emscripten_asm_const_int,
  'emscripten_conditional_set_current_thread_status':
      _emscripten_conditional_set_current_thread_status,
  'emscripten_futex_wait': _emscripten_futex_wait,
  'emscripten_futex_wake': _emscripten_futex_wake,
  'emscripten_get_now': _emscripten_get_now,
  'emscripten_memcpy_big': _emscripten_memcpy_big,
  'emscripten_receive_on_main_thread_js': _emscripten_receive_on_main_thread_js,
  'emscripten_resize_heap': _emscripten_resize_heap,
  'emscripten_set_canvas_element_size': _emscripten_set_canvas_element_size,
  'emscripten_set_current_thread_status': _emscripten_set_current_thread_status,
  'emscripten_webgl_create_context': _emscripten_webgl_create_context,
  'fd_close': _fd_close,
  'fd_seek': _fd_seek,
  'fd_write': _fd_write,
  'initPthreadsJS': initPthreadsJS,
  'memory': wasmMemory,
  'pthread_create': _pthread_create,
  'pthread_join': _pthread_join,
  'setTempRet0': _setTempRet0
};
var asm = createWasm();
var ___wasm_call_ctors = Module['___wasm_call_ctors'] = function() {
  return (___wasm_call_ctors = Module['___wasm_call_ctors'] =
              Module['asm']['__wasm_call_ctors'])
      .apply(null, arguments)
};
var _main = Module['_main'] = function() {
  return (_main = Module['_main'] = Module['asm']['main'])
      .apply(null, arguments)
};
var _emscripten_tls_init = Module['_emscripten_tls_init'] = function() {
  return (_emscripten_tls_init = Module['_emscripten_tls_init'] =
              Module['asm']['emscripten_tls_init'])
      .apply(null, arguments)
};
var _emscripten_get_global_libc =
    Module['_emscripten_get_global_libc'] = function() {
      return (_emscripten_get_global_libc =
                  Module['_emscripten_get_global_libc'] =
                      Module['asm']['emscripten_get_global_libc'])
          .apply(null, arguments)
    };
var ___errno_location = Module['___errno_location'] = function() {
  return (___errno_location = Module['___errno_location'] =
              Module['asm']['__errno_location'])
      .apply(null, arguments)
};
var ___emscripten_pthread_data_constructor =
    Module['___emscripten_pthread_data_constructor'] = function() {
      return (___emscripten_pthread_data_constructor =
                  Module['___emscripten_pthread_data_constructor'] =
                      Module['asm']['__emscripten_pthread_data_constructor'])
          .apply(null, arguments)
    };
var _pthread_self = Module['_pthread_self'] = function() {
  return (_pthread_self = Module['_pthread_self'] =
              Module['asm']['pthread_self'])
      .apply(null, arguments)
};
var ___pthread_tsd_run_dtors = Module['___pthread_tsd_run_dtors'] = function() {
  return (___pthread_tsd_run_dtors = Module['___pthread_tsd_run_dtors'] =
              Module['asm']['__pthread_tsd_run_dtors'])
      .apply(null, arguments)
};
var _emscripten_current_thread_process_queued_calls =
    Module['_emscripten_current_thread_process_queued_calls'] = function() {
      return (_emscripten_current_thread_process_queued_calls =
                  Module['_emscripten_current_thread_process_queued_calls'] =
                      Module['asm']
                            ['emscripten_current_thread_process_queued_calls'])
          .apply(null, arguments)
    };
var _emscripten_register_main_browser_thread_id =
    Module['_emscripten_register_main_browser_thread_id'] = function() {
      return (_emscripten_register_main_browser_thread_id =
                  Module['_emscripten_register_main_browser_thread_id'] =
                      Module['asm']
                            ['emscripten_register_main_browser_thread_id'])
          .apply(null, arguments)
    };
var _emscripten_main_browser_thread_id =
    Module['_emscripten_main_browser_thread_id'] = function() {
      return (_emscripten_main_browser_thread_id =
                  Module['_emscripten_main_browser_thread_id'] =
                      Module['asm']['emscripten_main_browser_thread_id'])
          .apply(null, arguments)
    };
var __emscripten_do_dispatch_to_thread =
    Module['__emscripten_do_dispatch_to_thread'] = function() {
      return (__emscripten_do_dispatch_to_thread =
                  Module['__emscripten_do_dispatch_to_thread'] =
                      Module['asm']['_emscripten_do_dispatch_to_thread'])
          .apply(null, arguments)
    };
var _emscripten_sync_run_in_main_thread_2 =
    Module['_emscripten_sync_run_in_main_thread_2'] = function() {
      return (_emscripten_sync_run_in_main_thread_2 =
                  Module['_emscripten_sync_run_in_main_thread_2'] =
                      Module['asm']['emscripten_sync_run_in_main_thread_2'])
          .apply(null, arguments)
    };
var _emscripten_sync_run_in_main_thread_4 =
    Module['_emscripten_sync_run_in_main_thread_4'] = function() {
      return (_emscripten_sync_run_in_main_thread_4 =
                  Module['_emscripten_sync_run_in_main_thread_4'] =
                      Module['asm']['emscripten_sync_run_in_main_thread_4'])
          .apply(null, arguments)
    };
var _emscripten_main_thread_process_queued_calls =
    Module['_emscripten_main_thread_process_queued_calls'] = function() {
      return (_emscripten_main_thread_process_queued_calls =
                  Module['_emscripten_main_thread_process_queued_calls'] =
                      Module['asm']
                            ['emscripten_main_thread_process_queued_calls'])
          .apply(null, arguments)
    };
var _emscripten_run_in_main_runtime_thread_js =
    Module['_emscripten_run_in_main_runtime_thread_js'] = function() {
      return (_emscripten_run_in_main_runtime_thread_js =
                  Module['_emscripten_run_in_main_runtime_thread_js'] =
                      Module['asm']['emscripten_run_in_main_runtime_thread_js'])
          .apply(null, arguments)
    };
var __emscripten_call_on_thread =
    Module['__emscripten_call_on_thread'] = function() {
      return (__emscripten_call_on_thread =
                  Module['__emscripten_call_on_thread'] =
                      Module['asm']['_emscripten_call_on_thread'])
          .apply(null, arguments)
    };
var __emscripten_thread_init = Module['__emscripten_thread_init'] = function() {
  return (__emscripten_thread_init = Module['__emscripten_thread_init'] =
              Module['asm']['_emscripten_thread_init'])
      .apply(null, arguments)
};
var stackSave = Module['stackSave'] = function() {
  return (stackSave = Module['stackSave'] = Module['asm']['stackSave'])
      .apply(null, arguments)
};
var stackRestore = Module['stackRestore'] = function() {
  return (stackRestore = Module['stackRestore'] = Module['asm']['stackRestore'])
      .apply(null, arguments)
};
var stackAlloc = Module['stackAlloc'] = function() {
  return (stackAlloc = Module['stackAlloc'] = Module['asm']['stackAlloc'])
      .apply(null, arguments)
};
var _emscripten_stack_set_limits =
    Module['_emscripten_stack_set_limits'] = function() {
      return (_emscripten_stack_set_limits =
                  Module['_emscripten_stack_set_limits'] =
                      Module['asm']['emscripten_stack_set_limits'])
          .apply(null, arguments)
    };
var _malloc = Module['_malloc'] = function() {
  return (_malloc = Module['_malloc'] = Module['asm']['malloc'])
      .apply(null, arguments)
};
var _free = Module['_free'] = function() {
  return (_free = Module['_free'] = Module['asm']['free'])
      .apply(null, arguments)
};
var _memalign = Module['_memalign'] = function() {
  return (_memalign = Module['_memalign'] = Module['asm']['memalign'])
      .apply(null, arguments)
};
var dynCall_jiji = Module['dynCall_jiji'] = function() {
  return (dynCall_jiji = Module['dynCall_jiji'] = Module['asm']['dynCall_jiji'])
      .apply(null, arguments)
};
var __emscripten_allow_main_runtime_queued_calls =
    Module['__emscripten_allow_main_runtime_queued_calls'] = 4080;
var __emscripten_main_thread_futex = Module['__emscripten_main_thread_futex'] =
    4420;
Module['PThread'] = PThread;
Module['PThread'] = PThread;
Module['wasmMemory'] = wasmMemory;
Module['ExitStatus'] = ExitStatus;
var calledRun;
function ExitStatus(status) {
  this.name = 'ExitStatus';
  this.message = 'Program terminated with exit(' + status + ')';
  this.status = status
}
var calledMain = false;
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller
};
function callMain(args) {
  var entryFunction = Module['_main'];
  args = args || [];
  var argc = args.length + 1;
  var argv = stackAlloc((argc + 1) * 4);
  HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram);
  for (var i = 1; i < argc; i++) {
    HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])
  }
  HEAP32[(argv >> 2) + argc] = 0;
  try {
    var ret = entryFunction(argc, argv);
    exit(ret, true)
  } catch (e) {
    if (e instanceof ExitStatus) {
      return
    } else if (e == 'unwind') {
      return
    } else {
      var toLog = e;
      if (e && typeof e === 'object' && e.stack) {
        toLog = [e, e.stack]
      }
      err('exception thrown: ' + toLog);
      quit_(1, e)
    }
  } finally {
    calledMain = true
  }
}
function run(args) {
  args = args || arguments_;
  if (runDependencies > 0) {
    return
  }
  if (ENVIRONMENT_IS_PTHREAD) {
    initRuntime();
    postMessage({'cmd': 'loaded'});
    return
  }
  preRun();
  if (runDependencies > 0) {
    return
  }
  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();
    if (shouldRunNow) callMain(args);
    postRun()
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('')
      }, 1);
      doRun()
    }, 1)
  } else {
    doRun()
  }
}
Module['run'] = run;
function exit(status, implicit) {
  EXITSTATUS = status;
  if (implicit && keepRuntimeAlive() && status === 0) {
    return
  }
  if (!implicit) {
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({'cmd': 'exitProcess', 'returnCode': status});
      throw new ExitStatus(status)
    } else {
    }
  }
  if (keepRuntimeAlive()) {
  } else {
    PThread.terminateAllThreads();
    exitRuntime();
    if (Module['onExit']) Module['onExit'](status);
    ABORT = true
  }
  quit_(status, new ExitStatus(status))
}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function')
    Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()()
  }
}
var shouldRunNow = true;
if (Module['noInitialRun']) shouldRunNow = false;
if (ENVIRONMENT_IS_PTHREAD) {
  noExitRuntime = false;
  PThread.initWorker()
}
run();
