
Doc:
https://developer.nvidia.com/blog/introduction-turing-mesh-shaders/
https://on-demand.gputechconf.com/siggraph/2018/video/sig1811-3-christoph-kubisch-mesh-shaders.html


Mesh: a mesh is a collection of vertices arranged into point, line, or triangle
 The mesh shader invocations collectively must
    produce a mesh, which consists of:
```
    a primitive count, written to the built-in output gl_PrimitiveCountNV;

    a collection of vertex attributes, where each vertex in the mesh has a
      set of built-in and user-defined per-vertex output variables and blocks;

    a collection of primitive attributes, where each of the
      gl_PrimitiveCountNV primitives in the mesh has a set of built-in and
      user-defined per-primitive output variables and blocks; and

    an array of vertex index values written to the built-in output array
      gl_PrimitiveIndicesNV, where each output primitive has a set of one,
      two, or three indices that identify the output vertices in the mesh used
      to form the primitive.
```


GLSL vertex shader:

A triangle:
```
#version 450

layout (location = 0) in vec3 inPos;
layout (location = 1) in vec3 inColor;

layout (binding = 0) uniform UBO 
{
	mat4 projectionMatrix;
	mat4 modelMatrix;
	mat4 viewMatrix;
} ubo;

layout (location = 0) out vec3 outColor;

out gl_PerVertex 
{
    vec4 gl_Position;   
};


void main() 
{
	outColor = inColor;
	gl_Position = ubo.projectionMatrix * ubo.viewMatrix * ubo.modelMatrix * vec4(inPos.xyz, 1.0);
}

```

A texture:
```
#version 450

layout (location = 0) in vec3 inPos;
layout (location = 1) in vec2 inUV;
layout (location = 2) in vec3 inNormal;

layout (binding = 0) uniform UBO 
{
	mat4 projection;
	mat4 model;
	vec4 viewPos;
	float lodBias;
} ubo;

layout (location = 0) out vec2 outUV;
layout (location = 1) out float outLodBias;
layout (location = 2) out vec3 outNormal;
layout (location = 3) out vec3 outViewVec;
layout (location = 4) out vec3 outLightVec;

out gl_PerVertex 
{
    vec4 gl_Position;   
};

void main() 
{
	outUV = inUV;
	outLodBias = ubo.lodBias;

	vec3 worldPos = vec3(ubo.model * vec4(inPos, 1.0));

	gl_Position = ubo.projection * ubo.model * vec4(inPos.xyz, 1.0);

    vec4 pos = ubo.model * vec4(inPos, 1.0);
	outNormal = mat3(inverse(transpose(ubo.model))) * inNormal;
	vec3 lightPos = vec3(0.0);
	vec3 lPos = mat3(ubo.model) * lightPos.xyz;
    outLightVec = lPos - pos.xyz;
    outViewVec = ubo.viewPos.xyz - pos.xyz;		
}

```

除去Vertex shader类似的部分，Mesh shader最有特色的其实是Culling：
http://meshshading.vzout.com/mesh_shading.pdf
