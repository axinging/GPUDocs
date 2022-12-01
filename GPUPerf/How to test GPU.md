
## Intel GPU tools (Linux)

Check is kernel is lock down:
```
cat /sys/kernel/security/lockdown
```
How to unlock kernel:
```
Alt+SysRq+X
```


https://medium.com/@niklaszantner/check-your-intel-gpu-usage-via-commandline-11196a7ee827
https://manpages.ubuntu.com/manpages/jammy/man1/intel_gpu_frequency.1.html
```
       intel_gpu_frequency -gmin,cur
              Get the current and minimum frequency.

       intel_gpu_frequency -s 400
              Lock frequency to 400Mhz.

       intel_gpu_frequency -c max=750
              Set the max frequency to 750MHz
```

## NV nvidia-smi (Win, Linux)

https://developer.nvidia.com/blog/advanced-api-performance-setstablepowerstate/
```
Use the nvidia-smi utility to set the GPU core and memory clocks before attempting measurements. This command is installed by typical driver installations on Windows and Linux. Installation locations may vary by OS version but should be fairly stable.
Run commands on an administrator console on Windows, or prepend sudo to the following commands on Linux-like OSs.
To query supported clock rates
nvidia-smi --query-supported-clocks=timestamp,gpu_name,gpu_uuid,memory,graphics --format=csv
To set the core and memory clock rates, respectively:
nvidia-smi --lock-gpu-clocks=<core_clock_rate>
nvidia-smi --lock-memory-clocks=<memory_clock_rate>
Perform performance capture or other work.
To reset the core and memory clock rates, respectively:
nvidia-smi --reset-gpu-clocks
nvidia-smi --reset-memory-clocks
For general use during a project, it may be convenient to write a simple script to lock the clocks, launch your application, and after exit, reset the clocks.
For command-line help, run nvidia-smi --help. There are shortened versions of the commands listed earlier for your convenience.
For more information, see NVIDIA System Management Interface.
Use the DX12 function SetStablePowerState to read the GPU’s predetermined stable power clock rate. The stable GPU clock rate may vary by board.
Modify a DX12 sample to invoke SetStablePowerState.
Execute nvidia-smi -q -d CLOCK, and record the Graphics clock frequency with the SetStablePowerState sample running. Use this frequency with the --lock-gpu-clocks option.
Use Nsight Graphics’s GPU Trace activity with the option to lock core and memory clock rates during profiling (Figure 1).
```

## Does Boost Clock Matter?

https://www.easypc.io/gpu-memory-clock-speed/


## Perf tuning on NV
https://developer.nvidia.com/gpugems/gpugems/part-v-performance-and-practicalities/chapter-28-graphics-pipeline-performance
