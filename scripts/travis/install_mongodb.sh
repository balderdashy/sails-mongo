#!/usr/bin/env bash

MDB_ROOT=${TRAVIS_BUILD_DIR}/mongodb
MDB_BIN=${MDB_ROOT}/mongodb-linux-x86_64-${MONGODB}
MDB_DATA=${MDB_ROOT}/data

if [ ! -f "${MDB_BIN}/bin/mongod" ]; then
  mkdir -p $MDB_ROOT
  pushd $MDB_ROOT
  wget http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${MONGODB}.tgz
  tar xzf mongodb-linux-x86_64-${MONGODB}.tgz
  rm -f mongodb-linux-x86_64-${MONGODB}.tgz
  popd
fi
mkdir -p $MDB_DATA
"${MDB_BIN}/bin/mongod" --version
