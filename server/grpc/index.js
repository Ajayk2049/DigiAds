const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const config = require('../config/config');
const isDev = config.env === 'development' || config.demoMode;

const { deviceServiceHandlers } = require('./services/deviceService');
const { menuServiceHandlers } = require('./services/menuService');
const { orderServiceHandlers } = require('./services/orderService');

// ----------------------------------------------------
// gRPC Setup (Device, Menu, Order)
// ----------------------------------------------------
const grpcServer = new grpc.Server({
  'grpc.max_receive_message_length': 10 * 1024 * 1024, // 10MB message ceiling (prevents memory exhaustion)
  'grpc.max_send_message_length': 10 * 1024 * 1024,
  'grpc.keepalive_time_ms': 30000,                      // 30s keepalive ping
  'grpc.keepalive_timeout_ms': 10000,                   // 10s ping timeout
  'grpc.keepalive_permit_without_calls': 1,
  'grpc.http2.min_time_between_pings_ms': 10000,        // Protects against HTTP/2 ping floods
  'grpc.http2.max_pings_without_data': 0
});

// Load Proto Files
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const orderDef = protoLoader.loadSync(path.join(__dirname, '..', 'protos', 'order.proto'), loaderOptions);
const deviceDef = protoLoader.loadSync(path.join(__dirname, '..', 'protos', 'device.proto'), loaderOptions);
const menuDef = protoLoader.loadSync(path.join(__dirname, '..', 'protos', 'menu.proto'), loaderOptions);

const orderProto = grpc.loadPackageDefinition(orderDef).order;
const deviceProto = grpc.loadPackageDefinition(deviceDef).device;
const menuProto = grpc.loadPackageDefinition(menuDef).menu;

function startGrpc() {
  grpcServer.addService(deviceProto.DeviceService.service, deviceServiceHandlers);
  grpcServer.addService(menuProto.MenuService.service, menuServiceHandlers);
  grpcServer.addService(orderProto.OrderService.service, orderServiceHandlers);

  const grpcBindHost = process.env.GRPC_BIND_HOST || (isDev ? '0.0.0.0' : '127.0.0.1');

  grpcServer.bindAsync(
    `${grpcBindHost}:${config.grpcPort}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[gRPC Server] Binding failed:', err.message);
        return;
      }
      grpcServer.start();
      console.log(`[gRPC Server] Listening on ${grpcBindHost}:${port}`);
    }
  );
}

module.exports = {
  grpcServer,
  startGrpc
};
