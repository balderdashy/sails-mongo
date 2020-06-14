#!/usr/bin/env bash

MDB_TGZ=mongodb-linux-x86_64-ubuntu1604-${MONGODB}.tgz
MDB_ROOT=${TRAVIS_BUILD_DIR}/mongodb/${MONGODB}
MDB_DATA=${TRAVIS_BUILD_DIR}/mongodb-data

# If it doesn't exist, it means the cache didn't pull it
if [ ! -f "${MDB_ROOT}/bin/mongod" ]; then
  mkdir -p $MDB_ROOT
  pushd $MDB_ROOT
  wget https://fastdl.mongodb.org/linux/${MDB_TGZ}
  tar xzf ${MDB_TGZ} --strip 1
  rm -f ${MDB_TGZ}
  popd
fi
mkdir -p $MDB_DATA
"${MDB_ROOT}/bin/mongod" --version
