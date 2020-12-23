## Vulkan的Pipeline

我们给别人介绍GPU的时候，第一个要浓墨重彩介绍的，就是GPU的Pipeline：流水线。

OpenGL红宝书里面将Pipeline翻译成管线，一直不理解。但是现在我理解了，确实翻译成流水线更好。你看渲染流水线上的一个个模块，这个完成三角形的组装，那个完成三角形的渲染，还有做透视除法，而且是按着顺序，这个模块做完了交给下一个，和手机生产车间的流水线是类似的。所以确实就是流水线。

但是VkPipeline不是流水线，流水线是硬件实现的。它也不是GPU流水线的软件抽象。它只是描述了GPU流水线的某些需要用户设置的状态。以流水线的原语组装来说，VkPipeline并不负责组装，但是它可以设置一些组装的模式，譬如顶点是组装成点、线、还是三角形。和D3D里面的Pipeline State Object类似。所以VkPipeline其实是一个不太准确的名字。

VkPipeline，加上另外两个集合对象VkDescriptorSet，VkConmandBuffer，描述了GPU渲染相关的主要数据和状态:

- VkPipeline： 包含了shader和其他流水线需要的信息；流水线需要的其他信息有：绘图原语的组装VkPrimitiveTopology，裁剪模式VkCullModeFlagBits，正反面的设置VkFrontFace等等。所有这些信息，存储在VkPipeline里面，然后通过GPU命令vkCmdBindPipeline进行绑定。绑定的意思，其实是说，命令缓冲区里面的这些GPU命令会使用这个VkPipeline。要注意的是，这个Pipeline不同于GPU流水线，更像是流水线需要的一些状态的集合；

- VkDescriptorSet： 用来描述输入输出相关的资源的集合；数据通常存储在Buffer或者Texture里面；

- VkCommandBuffer：所有真正发送给GPU的命令的集合；

要完成一次完整的渲染，CPU要为GPU准备这三个集合以及相关的数据。

因为这三个集合本身以及集合元素里面的数据可能都比较庞大，所以需要有各种方法来避免大量的数据的传输。譬如说VkDescriptorSet，在提交GPU命令的时候，里面缓冲区和纹理数据大多数是不需要更新的，但是MVP相关的缓冲区里面的数据往往需要更新（因为用户视角可能变了）。VkCommandBuffer一般都是预先录制好几个，然后在场景变化的时候提交给GPU。

至于VkPipeline，根据哪些元素的变化会影响3D程序的界面更新，分为两种情况：

一种是Pipeline是确定的。通常3D程序呈现的场景发生变化，变换的往往不是场景，而是用户的视角（就是MVP矩阵等）。所以3D程序每次在提交GPU命令之前（vkQueueSubmit），都会更新相应的MVP矩阵缓冲区（uniform buffer）里面的内容。这个更新是在GPU命令外面完成的，但是由于GPU命令绑定了该缓冲区，所以流水线可以获取到更新后的视角相关的状态。这个时候，整个Pipeline是确定的，不需要更新或者重建。

对于场景的变化是由用户视角变化引起的，Pipeline的数据是确定的，就可以用预先创建好的Pipeline，在提交GPU命令的时候绑定就好了。

但是实际上可能有些其他的情况，Pipeline是不确定的，只有在提交Draw Call的时候，Pipeline才是确定的。文献[1]里面提到了下面这些情况也会影响用户观察到的内容，这些状态的修改，需要修改Pipeline的状态：

- 为了支持物体的镜像，需要在顺时针和逆时针之间点过来倒过去（VkFrontFace）；

- 有些编辑器，可能需要在填充模式和线框模式之间切换（VkPolygonMode）；

- 动态切换Blend状态；

- 在渲染影子的时候，调整depth biasing；


## 问题：调整Pipeline代价较大

前面提到，对于需要调整Pipeline的场景，由于Pipeline数据结构比较庞大，即使调整Pipeline的某一个参数，也需要重建整个pipeline，因此调整起来代价较大。

针对这个情况，有两种处理方法。


## 解决办法一： 缓存多组Pipeline

缓存多个Pipeline。譬如前面提到的为了支持镜像，需要顺时针和逆时针两种模式。这个时候可以为这两种状态准备两个Pipeline。提交给GPU的命令，准备两个Command Buffer，每一种GPU命令对应一种Pipeline。提交的时候根据上下文来提交就可以了。

文献实现的方法是准备多个Pipeline，存储到一个Hash表里面。Hash关键字的计算是根据这些信息得到的：

- 当前绑定的 VkRenderPass（对于计算而言是空的）；

- shader handle；

- 可选的用来识别render state 的handle。这些信息，就是前面提到的需要动态的修改Pipeline的那些状态；


## 解决办法二： Dynamic State

方法二的思路很简单，既然调整整个Pipeline的代价很大。那么，就增加一些API，可以局部调整Pipeline。由于这些Pipeline在提交GPU命令的时候才确定，所以这些API其实是以GPU命令的形式存在的：

```
vkCmdBindVertexBuffers2EXT
vkCmdSetCullModeEXT
vkCmdSetDepthBoundsTestEnableEXT
vkCmdSetDepthCompareOpEXT
vkCmdSetDepthTestEnableEXT
vkCmdSetDepthWriteEnableEXT
vkCmdSetFrontFaceEXT
vkCmdSetPrimitiveTopologyEXT
vkCmdSetScissorWithCountEXT
vkCmdSetStencilOpEXT
vkCmdSetStencilTestEnableEXT
vkCmdSetViewportWithCountEXT
```


## 例子：镜像效果

 ```
 VK_CHECK_RESULT(vkBeginCommandBuffer(drawCmdBuffers[i], &cmdBufInfo));
/*
	First render pass: Offscreen rendering
*/
{
	VkClearValue clearValues[2];
	clearValues[0].color = { { 0.0f, 0.0f, 0.0f, 0.0f } };
	clearValues[1].depthStencil = { 1.0f, 0 };
	VkRenderPassBeginInfo renderPassBeginInfo = vks::initializers::renderPassBeginInfo();
	renderPassBeginInfo.renderPass = offscreenPass.renderPass;
	renderPassBeginInfo.framebuffer = offscreenPass.frameBuffer;
	vkCmdBeginRenderPass(drawCmdBuffers[i], &renderPassBeginInfo, VK_SUBPASS_CONTENTS_INLINE);
	// Mirrored scene
	vkCmdBindDescriptorSets(drawCmdBuffers[i], VK_PIPELINE_BIND_POINT_GRAPHICS, pipelineLayouts.shaded, 0, 1, &descriptorSets.offscreen, 0, NULL);
	vkCmdBindPipeline(drawCmdBuffers[i], VK_PIPELINE_BIND_POINT_GRAPHICS, pipelines.shadedOffscreen);
    // 虽然vkCmdSetCullModeEXT可以修改Pipeline，但是由于原像和镜像的shader有区别，所以其实还是需要两个pipeline。
	models.example.draw(drawCmdBuffers[i]);
	vkCmdEndRenderPass(drawCmdBuffers[i]);
}
/*
	Second render pass: Scene rendering
*/
{
	VkRenderPassBeginInfo renderPassBeginInfo = vks::initializers::renderPassBeginInfo();
	renderPassBeginInfo.renderPass = renderPass;
	renderPassBeginInfo.framebuffer = frameBuffers[i];
	vkCmdBeginRenderPass(drawCmdBuffers[i], &renderPassBeginInfo, VK_SUBPASS_CONTENTS_INLINE);
	// Render the reflection plane
	vkCmdBindDescriptorSets(drawCmdBuffers[i], VK_PIPELINE_BIND_POINT_GRAPHICS, pipelineLayouts.textured, 0, 1, &descriptorSets.mirror, 0, nullptr);
	vkCmdBindPipeline(drawCmdBuffers[i], VK_PIPELINE_BIND_POINT_GRAPHICS, pipelines.mirror);
	models.plane.draw(drawCmdBuffers[i]);
	vkCmdEndRenderPass(drawCmdBuffers[i]);
}
VK_CHECK_RESULT(vkEndCommandBuffer(drawCmdBuffers[i]));
 ```

如果两个pipeline，除了Cull mode不同，其他完全一样，那么如果有了VK_EXT_EXTENDED_DYNAMIC_STATE, 就不需要准备两个Pipeline，直接通过vkCmdSetCullModeEXT来修改同一个Pipeline就可以了。

但是，针对目前这个场景，除了Cull Mode，还需要修改shader和pipelineLayouts。
```
rasterizationState.cullMode = VK_CULL_MODE_BACK_BIT;
// Phong shading pipelines
pipelineCI.layout = pipelineLayouts.shaded;
// Scene
shaderStages[0] = loadShader(getShadersPath() + "offscreen/phong.vert.spv", K_SHADER_STAGE_VERTEX_BIT);
shaderStages[1] = loadShader(getShadersPath() + "offscreen/phong.frag.spv", K_SHADER_STAGE_FRAGMENT_BIT);
```

所以我理解其实需要将更多的流水线状态包含到VK_EXT_EXTENDED_DYNAMIC_STATE里面来，否则应用场景太有限了。

镜子效果代码：https://github.com/SaschaWillems/Vulkan/blob/master/examples/offscreen/offscreen.cpp

## 参考文献

[1] https://ourmachinery.com/post/vulkan-pipelines-and-render-states/
[2] https://xdc2020.x.org/event/9/contributions/627/attachments/717/1320/How-the-Vulkan-VK_EXT_extended_dynamic_state-extension-came-to-be-final.pdf