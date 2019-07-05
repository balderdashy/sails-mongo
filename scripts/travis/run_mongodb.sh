#!/usr/bin/env bash

MDB_ROOT=${PWD}/mongodb
MDB_BIN=${MDB_ROOT}/mongodb-linux-x86_64-${MONGODB}
MDB_DATA=${MDB_ROOT}/data

${MDB_BIN}/bin/mongod --dbpath ${MDB_DATA} --smallfiles --logpath=/dev/null --fork
