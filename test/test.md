https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Mac_Arm/979011/ ,  bad

https://chromium.googlesource.com/chromium/src/+/main/docs/mac_arm64.md
xattr -rc Chromium.app

https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Mac_Arm/1000000/


node src/main.js --target performance  --browser "/Applications/Chromium.app/Contents/MacOS/Chromium" --browser-args="--enable-unsafe-webgpu --disable-dawn-features=disallow_unsafe_apis" --performance-backend webgl,webgpu  --benchmark-url https://.com/workspace/project/abc/tfjs/ --email def@abc.com --local-build='' —repeat 5

node src/main.js --target performance --benchmark-url https://  --browser "C:\Program Files\Google\Chrome\Application\chrome.exe" --browser-args="--enable-unsafe-webgpu --disable-dawn-features=disallow_unsafe_apis" --performance-backend webgl,webgpu --email abc.com --local-build=''


```
CURRENT_BRANCH=$(git branch --show-current)
git checkout master
git remote add upstream  https://github.com/tensorflow/tfjs.git
git fetch upstream
git checkout master
git rebase upstream/master
git checkout master
git push
git checkout $CURRENT_BRANCH
git rebase master

yarn
yarn bazel clean
cd link-package && yarn build-deps-for tfjs-backend-webgpu tfjs-core tfjs-backend-cpu  tfjs-backend-webgl tfjs-converter
cd ../tfjs-backend-webgpu && rm -fr node_modules && yarn && yarn build-npm
yarn --cwd .. bazel build //tfjs-backend-webgpu/src:tests
ln -s ../dist/bin/tfjs-backend-webgpu/src/tests.ts tests
yarn && yarn build-npm
yarn karma start --no-single-run  --grep="toPixels"
```


```
set https_proxy=http://child-abc.com:913/
set http_proxy=http://child-abc.com:913/

winget install --id=Python.Python.3 -e
winget install --id Git.Git -e --source winget
winget install OpenJS.NodeJS.LTS


git config --global http.proxy http://child-abc.com:913/
git config --global https.proxy http://child-abc.com:913/

yarn config set proxy http://child-abc.com:913/
yarn config set https-proxy http://child-abc.com:913/

npm config set http.proxy http://child-abc.com:913/
npm config set https.proxy http://child-abc.com:913/

npm install --global yarn

git clone https://github.com/webatintel/webtest.git
```

msiexec.exe /a https://nodejs.org/dist/v16.16.0/node-v16.16.0-x64.msi /quiet
winget install --id Git.Git -e --source winget




unsupported swap chain format
16context configuration is invalid.
16[Invalid Texture] is invalid.
 - While calling [Invalid Texture].CreateView([TextureViewDescriptor]).

16[Invalid TextureView] is invalid.
 - While validating entries[0] as a Texture.
Expected entry layout: { binding: 0, visibility: ShaderStage::Compute, storageTexture: { access: StorageTextureAccess::WriteOnly, format: TextureFormat::RGBA8Unorm, viewDimension: TextureViewDimension::e2D } }
 - While validating [BindGroupDescriptor] against [BindGroupLayout]
 - While calling [Device].CreateBindGroup([BindGroupDescriptor]).

16[Invalid BindGroup] is invalid.
 - While encoding [ComputePassEncoder].SetBindGroup(0, [Invalid BindGroup], 0, ...).

16[Invalid CommandBuffer] is invalid.
    at ValidateObject (..<URL>)
    at ValidateSubmit (..<URL>)
