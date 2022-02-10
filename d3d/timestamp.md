
How CPU time correlates with GPU time

### Ticks，Frequency
Ticks 是从设备开始工作到目前一共经历了多少滴答。
Frequency是指一秒钟设备有多少滴答。

时间计算:Ticks/Frequency 默认单位是秒。

### Windows接口介绍：
QueryPerformanceCounter：获取Ticks。

QueryPerformanceFrequency：获取CPU frequency.

ID3D12CommandQueue::GetTimestampFrequency: 获取GPU frequency.

ID3D12CommandQueue::GetClockCalibration: 同时获取CPU的Ticks和GPU的Ticks。

### CPU时间的计算：

方法1：
QueryPerformanceCounter/QueryPerformanceFrequency

方法2：
CPU ID3D12CommandQueue::GetClockCalibration/QueryPerformanceFrequency


### GPU时间的计算：

GPU ID3D12CommandQueue::GetClockCalibration/ID3D12CommandQueue::GetTimestampFrequency

### 把CPU时间和GPU时间关联起来
在程序开始的时候，通过调用ID3D12CommandQueue::GetClockCalibration，获取一个绝对的CPU，GPU时间起点。
请注意，这个时间是Ticks。我们称作CPUTicks0, GPUTicks0.

然后，对两个Ticks分别除以各自的频率，获得两个对应的时间设备时间，CPUTime0, GPUTime0。这两个时间，在单位上统一了。而且因为是同一时间对CPU，GPU时钟进行采样的，所以，对应绝对时间的统同一时刻。也就是说，可以把它们当作后续CPU获取时间的0点，GPU获取时间的0点。这样，我们就可以准备两条线，一条CPU，一条GPU，前者的原点是CPUTime0，后者的原点是GPUTime0。虽然两者是不同的设备时间，但是在绝对时间层面，是统一的，可一进行比较的。

### 问题

Dawn的时间和JS的时间怎么统一。


### Chrome Tracing Time
Chrome Tracing 有一个ts的成员，这个成员的时间单位是us（1000us=1ms）。
```
{"args":{"location":{"file_name":"base/threading/thread.cc","function_name":"Run","line_number":334}},"cat":"test","dur":8374221,"name":"RunLoop::Run","ph":"X","pid":12124,"tdur":2066,"tid":4116,"ts":66695088665,"tts":378},
```
Tracing这个时间的单位是真实的时间，所以单位是us。
Native通过GetClockCalibration获取的CPU timestamp，是Ticks，除以频率后，这两个时间是可以比较的。

JS通过GPU timestamp获取的也是时间，Native通过GetClockCalibration获取的GPU timestamp，是Ticks，除以频率后，JS时间和Native的GPU时间也可以比较的。

Native获取CPU时间，GPU时间：
```
// Execute the command list.
ID3D12CommandList* ppCommandLists[] = { m_commandList.Get() };
UINT64 gpuTimestampBegin, gpuTimestampEnd;
UINT64 cpuTimestampBegin, cpuTimestampEnd;
m_commandQueue->GetClockCalibration(&gpuTimestampBegin, &cpuTimestampBegin);
m_commandQueue->ExecuteCommandLists(_countof(ppCommandLists), ppCommandLists);
WaitForGpu();
m_commandQueue->GetClockCalibration(&gpuTimestampEnd, &cpuTimestampEnd);
{
	// mTimestampPeriod = static_cast<float>(1e9) / frequency;
	const double gpuAdjust = double(TIME_UNIT) / double(m_timestampFrequency);
	const double cpuAdjust = double(TIME_UNIT) / double(m_cputimestampFrequency);
	printf("\n cpuAdjust= %f, gpuAdjust=%f\n", cpuAdjust, gpuAdjust);
	// printf("\noriginal CPU: %lld,%lld,%f\n", cpuTimestampBegin, cpuTimestampEnd, double((cpuTimestampEnd - cpuTimestampBegin)));
	// printf("\noriginal GPU: %lld,%lld,%f\n", gpuTimestampBegin, gpuTimestampEnd, double((gpuTimestampEnd - gpuTimestampBegin)));\
	// printf("\nttt CPU: %lld,%lld,%f\n", double(cpuTimestampBegin)/ double(m_cputimestampFrequency)
	printf("\nCPU: %f,%f,%f\n", double(cpuTimestampBegin)*double(TIME_UNIT) / double(m_cputimestampFrequency), cpuTimestampEnd *double(TIME_UNIT) / double(m_cputimestampFrequency), double((cpuTimestampEnd - cpuTimestampBegin))* double(TIME_UNIT) / double(m_cputimestampFrequency));
	printf("\nGPU: %f,%f,%f\n", double(gpuTimestampBegin)*double(TIME_UNIT) / double(m_timestampFrequency), gpuTimestampEnd*double(TIME_UNIT) / double(m_timestampFrequency), double((gpuTimestampEnd - gpuTimestampBegin))* double(TIME_UNIT) / double(m_timestampFrequency));
}
```

JS获取GPU时间：
```
  async getTimeFromQuerySet(querySet: GPUQuerySet) {
    const queryBuffer = this.acquireBuffer(
        16, GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE);
    const dst = this.acquireBuffer(
        16, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

    this.ensureCommandEncoderReady();
    this.ensureComputePassEnded();
    this.currentCommandEncoder.resolveQuerySet(querySet, 0, 2, queryBuffer, 0);
    this.currentCommandEncoder.copyBufferToBuffer(queryBuffer, 0, dst, 0, 16);
    this.submitQueue();
    await dst.mapAsync(GPUMapMode.READ);
    const arrayBuf = new BigUint64Array(dst.getMappedRange());
    const timeElapsedNanos = Number((arrayBuf[1] - arrayBuf[0]));
    // Dawn use ns(1s = 1e9 ns), here we use us(1s = 1e6 us) to align with tracing timestamp.
    const gpuAdjust = 1000.0;// 1e9/12000048.0;
    console.log(((Number(arrayBuf[0]))/gpuAdjust).toFixed(3) + ", " + ((Number(arrayBuf[1])/gpuAdjust).toFixed(3)));
    dst.unmap();
    this.bufferManager.releaseBuffer(
        dst, 16, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
    this.bufferManager.releaseBuffer(
        queryBuffer, 16,
        GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE);
    // Return milliseconds.
    return timeElapsedNanos / 1000000;
  }
```


### 具体方案

1. ID3D12CommandQueue::GetClockCalibration获取CPUTime0， GPUTime0。
2. 分别获取各种CPU时间，GPU时间。

```
uint64_t frequency = 12000048;
DAWN_TRY(CheckHRESULT(device->GetCommandQueue()->GetTimestampFrequency(&frequency),
					  "D3D12 get timestamp frequency"));

LARGE_INTEGER cputimestampFrequency;	  // m_cputimestampFrequency;	 
QueryPerformanceFrequency(&cputimestampFrequency);	  
// double cpu = static_cast<double>(1e3)/double(cputimestampFrequency.QuadPart);
double gpu = static_cast<double>(1e3)/double(frequency);


UINT64 gpuTimestampBegin, gpuTimestampEnd;		  
UINT64 cpuTimestampBegin, cpuTimestampEnd;		  
device->GetCommandQueue()->GetClockCalibration(&gpuTimestampBegin, &puTimestampBegin);
device->GetCommandQueue()->GetClockCalibration(&gpuTimestampEnd, &cpuTimestampEnd);
char buffer [80];
/*
snprintf(buffer, 80, "Queue::SubmitImpl: %f, %f, %f,%f", (double)puTimestampBegin*gpu, 
	(double)gpuTimestampEnd*gpu, (double)cpuTimestampBegin*cpu, (double)cpuTimestampEnd*cpu);
*/
snprintf(buffer, 80, "Queue::SubmitImpl: %f", (double)gpuTimestampBegin*gpu);
fprintf(stderr, "%s\n", buffer);
dawn::LogMessage log = dawn::InfoLog();
log << buffer;
device->EmitLog(buffer);

```


##
```
Disjoint timestamp queries - 
GPU clocks can be set to a stable state in Direct3D 12 (see the Timing section). GPU clock comparisons are not meaningful if the GPU idled at all between the timestamps (known as a disjoint query). 

With stable power two timestamp queries issued from different command lists are reliably comparable. Two timestamps within the same command list are always reliably comparable.
```

https://docs.microsoft.com/en-us/windows/win32/direct3d12/queries




## SetStablePowerState


```
Don’t ever call SetStablePowerState(TRUE) from game engine code.

Do consider carefully whether or not you need highly stable results at the expense of lower performance. See the discussion in our blog.

If and only if you want its stable results, do call SetStablePowerState from a separate, standalone application.
```

https://developer.nvidia.com/dx12-dos-and-donts#powerstate
https://article.itxueyuan.com/Dp9Kd


CPU time:
https://stackoverflow.com/questions/1739259/how-to-use-queryperformancecounter

## Summary of CPU GPU time

Time = Ticks/Frequency (s).
Time = 1000 * Ticks/Frequency (s).

CPU ticks:

## How to get timestamp of dawn

1. Enable TimestampQuery and unsafe_apis
```
    std::vector<wgpu::FeatureName> requiredFeatures = {};
    requiredFeatures.push_back(wgpu::FeatureName::TimestampQuery);
    wgpu::DeviceDescriptor deviceDescriptor = {};
    deviceDescriptor.requiredFeatures = requiredFeatures.data();
    deviceDescriptor.requiredFeaturesCount = requiredFeatures.size();

    std::vector<const char*> forceDisabledToggles = {};
    // Disabled disallowing unsafe APIs so we can test them.
    forceDisabledToggles.push_back("disallow_unsafe_apis");
    wgpu::DawnTogglesDeviceDescriptor togglesDesc = {};
    togglesDesc.forceDisabledToggles = forceDisabledToggles.data();
    togglesDesc.forceDisabledTogglesCount = forceDisabledToggles.size();

    deviceDescriptor.nextInChain = &togglesDesc;

    WGPUDevice backendDevice = backendAdapter.CreateDevice(&deviceDescriptor);
    DawnProcTable backendProcs = dawn_native::GetProcs();
```

2. Get GPU timestamp per submit
```
    MaybeError Queue::SubmitImpl(uint32_t commandCount, CommandBufferBase* const* commands) {
        Device* device = ToBackend(GetDevice());

        DAWN_TRY(device->Tick());

        uint64_t frequency = 12000048;
        DAWN_TRY(CheckHRESULT(device->GetCommandQueue()->GetTimestampFrequency(&frequency),
                              "D3D12 get timestamp frequency"));

        LARGE_INTEGER cputimestampFrequency;
        QueryPerformanceFrequency(&cputimestampFrequency);
        double gpu = static_cast<double>(1e3) / double(frequency);

        UINT64 gpuTimestampBegin, gpuTimestampEnd;
        UINT64 cpuTimestampBegin, cpuTimestampEnd;
        device->GetCommandQueue()->GetClockCalibration(&gpuTimestampBegin, &cpuTimestampBegin);
        device->GetCommandQueue()->GetClockCalibration(&gpuTimestampEnd, &cpuTimestampEnd);
        char buffer[80];
        snprintf(buffer, 80, "%f", (double)gpuTimestampBegin * gpu);
        fprintf(stderr, "Queue::SubmitImpl %s, frequency= %llu\n", buffer, frequency);

        CommandRecordingContext* commandContext;
        DAWN_TRY_ASSIGN(commandContext, device->GetPendingCommandContext());
```



