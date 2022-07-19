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
