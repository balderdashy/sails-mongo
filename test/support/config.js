module.exports = {
  host: process.env.MONGO_PORT_27017_TCP_ADDR || process.env.WATERLINE_ADAPTER_TESTS_HOST || 'localhost',
  database: process.env.WATERLINE_ADAPTER_TESTS_DATABASE || 'sails-mongo',
  port: process.env.WATERLINE_ADAPTER_TESTS_PORT || 27017,
  nativeParser: false,
  safe: true
};
