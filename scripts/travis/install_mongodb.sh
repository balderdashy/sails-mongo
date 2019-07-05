#!/usr/bin/env bash

pushd /opt

if [ ! -d "/opt/mongodb-linux-x86_64-${MONGODB}" ]; then
  wget http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${MONGODB}.tgz
  tar xzf mongodb-linux-x86_64-${MONGODB}.tgz
  rm -f mongodb-linux-x86_64-${MONGODB}.tgz
fi
"/opt/mongodb-linux-x86_64-${MONGODB}/bin/mongod" --version

popd
