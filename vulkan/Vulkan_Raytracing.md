## Pipeline
![Vulkan Raytracing Arch](https://www.khronos.org/assets/uploads/blogs/2020-blog-ray-tracing-in-vulkan-figure-7.jpg)


##  BVH

BVH可以由GPU构建，也可以由CPU构建：
- VkCmdBuildAccelerationStructureKHR()
- VkCmdBuildAccelerationStructureIndirectKHR()
- VkBuildAccelerationStructureKHR() (for CPU builds)

## Shader


Any hit shaders are useful, for instance, when geometry has transparency
![D3D Raytracing](https://microsoft.github.io/DirectX-Specs/d3d/images/raytracing/traceRayControlFlow.png)


![Vulkan Raytracing Pipeline](https://www.khronos.org/assets/uploads/blogs/2020-blog-raytracing-img-08_1.png)



## Understand how manys rays will be generated

void vkCmdTraceRaysKHR(
    VkCommandBuffer                             commandBuffer,
    const VkStridedDeviceAddressRegionKHR*      pRaygenShaderBindingTable,
    const VkStridedDeviceAddressRegionKHR*      pMissShaderBindingTable,
    const VkStridedDeviceAddressRegionKHR*      pHitShaderBindingTable,
    const VkStridedDeviceAddressRegionKHR*      pCallableShaderBindingTable,
    uint32_t                                    width,
    uint32_t                                    height,
    uint32_t                                    depth);




## Reference

Raytracing: 
https://www.khronos.org/blog/ray-tracing-in-vulkan
https://xdc2020.x.org/event/9/contributions/613/attachments/715/1318/Ray-tracing_in_Vulkan.pdf


D3D Raytracing:
https://microsoft.github.io/DirectX-Specs/d3d/Raytracing.html#traceray-control-flow
