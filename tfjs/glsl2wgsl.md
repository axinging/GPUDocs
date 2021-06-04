
Limitations: 

1. builtin workgroup_size: can not be accessed by shader;
```
// [[builtin(workgroup_size)]] wg_size : vec3<u32>
// resultMatrix.numbers[index] = f32(wg_size.x);
```

2. Uniform can not be accessed globally.

```
// float NAN; int sizeA; int sizeB;
[[block]] struct Uniforms {
  NAN : f32;
  size: vec2<u32>;
};
[[group(0), binding(3)]] var<uniform> uniforms : Uniforms;
// let sizeA : u32 = uniforms.size[0];  //Not work!
```

3. shared memory size can not be var or uniform (caused by 2);

```
// let TileSize : u32 = 4;
var<workgroup> mm_Asub : array<f32, 4>;
```

4. function can not be overloaded
```
// Checks whether coordinates lie within the bounds of the shape.
fn coordsInBounds4(coord: vec4<i32>, shape: vec4<i32>) -> bool {
  return all(coord >= vec4<i32>(0, 0, 0, 0)) &&
      all(coord < shape);
}
fn coordsInBounds3(coord: vec3<i32>, shape: vec3<i32>) -> bool{
  return all(coord >= vec3<i32>(0, 0, 0)) &&
      all(coord < shape);
}
fn coordsInBounds2(coord: vec2<i32>, shape: vec2<i32>) -> bool {
  return all(coord >= vec2<i32>(0, 0)) &&
      all(coord < shape);
}
```

From: https://www.w3.org/TR/WGSL/#builtin-functions
"
Unlike ordinary functions defined in a WGSL program, a built-in function may use the same function name with different sets of parameters. In other words, a built-in function may have more than one overload, but ordinary function definitions in WGSL may not.
"

For examples, 
```
dot(e1: vecN<T>,e2: vecN<T>) -> T 
```
Works with differnet kind of inputs:
```
fn dottest(a: vec2<f32>, b : vec2<f32>) ->f32 {
  return dot(a, b);
}
fn dottest4(a: vec4<f32>, b : vec4<f32>) ->f32 {
  return dot(a, b);
}
```

Not, dot only supports vector f32:
dot(vecN<f32>, vecN<f32>) -> f32

5. less ops

```
index -= d0 * outShapeStrides[0];
=>
index = index - d0 * outShapeStrides[0]

```

6. Condition express is not supported

Not work:
```
resData = coordsInBounds(coord, xShape) ?
        x[getFlatIndex(coord, xShape) / 4] : vec4(0.0, 0.0, 0.0, 0.0);
```
Work ({} is required):
```
if (coordsInBounds(coord, xShape)) {
resData = x.numbers[getFlatIndex(coord, xShape) / 4];
} else {
resData = vec4<f32>(0.0, 0.0, 0.0, 0.0); 
} 

```

7. cannot assign to value of type

```
// error: cannot assign to value of type 'u32'
fn inputVar(index: u32) ->u32 {
    index = index - 3u;
    let a : u32 = index;
    return a;
}
```
Below works:
```
fn inputVar2(index: u32) ->u32 {
    var index2 : u32 = index - 3u;
    let a : u32 = index2;
    return a;
}
```



