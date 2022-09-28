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
