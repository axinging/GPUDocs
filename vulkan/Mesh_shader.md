
Doc:
https://developer.nvidia.com/blog/introduction-turing-mesh-shaders/
https://on-demand.gputechconf.com/siggraph/2018/video/sig1811-3-christoph-kubisch-mesh-shaders.html


Mesh: a mesh is a collection of vertices arranged into point, line, or triangle
 The mesh shader invocations collectively must
    produce a mesh, which consists of:

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
