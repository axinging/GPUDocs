
How CPU time correlates with GPU time

Ticks，Frequency
Ticks 是从设备开始工作到目前一共经历了多少滴答。
Frequency是指一秒钟设备有多少滴答。

时间计算:Ticks/Frequency 默认单位是秒。

Windows接口介绍：
QueryPerformanceCounter：获取Ticks。
QueryPerformanceFrequency：获取CPU frequency.
ID3D12CommandQueue::GetTimestampFrequency: 获取GPU frequency.
ID3D12CommandQueue::GetClockCalibration: 同时获取CPU的Ticks和GPU的Ticks。

CPU时间的计算：

方法1：
QueryPerformanceCounter/QueryPerformanceFrequency
方法2：
CPU ID3D12CommandQueue::GetClockCalibration/QueryPerformanceFrequency


GPU时间的计算：
GPU ID3D12CommandQueue::GetClockCalibration/ID3D12CommandQueue::GetTimestampFrequency


CPU time:
https://stackoverflow.com/questions/1739259/how-to-use-queryperformancecounter