
## terms:
Second Level Address Translation: SLAT;
ICD UMD:
ICD stands for Installable Client Driver (OpenGL)

## WSL 1 vs WSL 2

### WSL 1

- Linux userspace running against an emulated Linux Kernel

- Linux userspace isolated in a pico process

- Linux userspace call to kernel trap and emulated on top of ntos

###  WSL 2

- Full Linux userspace and Linux kernel running in a VM

- Same integrated experience

- Better compat (no more kernel emulation)


## RDP:

RAIL stands for Remote Application Interface Layer, and would presumably offer Win 32 applications access to the legacy Win32 APIs which Microsoft decided to remove, running safely on a remote Azure server.

VAIL is for when a network connection is not available and stands for  Virtualized Application Interface Layer. This would presumably offer the same service but running in a local container and allow Centennial apps to still function despite the core OS not offering the Win32 APIs needed anymore.

https://mspoweruser.com/secret-win32-apps-polaris-may-rail-vail/
https://www.phoronix.com/scan.php?page=news_item&px=Microsoft-Writing-Wayland-Comp


https://docs.microsoft.com/en-us/windows/wsl/install-manual



## X11 over WSL
https://xdc2020.x.org/event/9/contributions/611/attachments/702/1298/XDC2020_-_X11_and_Wayland_applications_in_WSL.pdf





## Demo

https://www.youtube.com/watch?v=EkNBsBx501Q: 30'20"

