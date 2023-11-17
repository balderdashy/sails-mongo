#!/usr/bin/env bash

MDB_ROOT=${TRAVIS_BUILD_DIR}/mongodb/${MONGODB}
MDB_DATA=${TRAVIS_BUILD_DIR}/mongodb-data

${MDB_ROOT}/bin/mongod --dbpath ${MDB_DATA} --logpath=/dev/null --fork
