const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const WebSocket = require('ws');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'chat.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

function createGrpcClient() {
  return new chatProto.ChatService('localhost:50051', grpc.credentials.createInsecure());
}

const wss = new WebSocket.Server({ port: 9090 });
console.log('Reverse proxy WebSocket en écoute sur ws://localhost:9090');

wss.on('connection', (ws) => {
  const grpcClient = createGrpcClient();
  const grpcStream = grpcClient.Chat();

  grpcStream.on('data', (msg) => {
    ws.send(JSON.stringify(msg));
  });

  grpcStream.on('error', (err) => {
    ws.send(JSON.stringify({ error: err.message }));
  });

  grpcStream.on('end', () => {
    ws.close();
  });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === "history") {
        grpcClient.GetChatHistory({}, (err, response) => {
          ws.send(JSON.stringify({ history: response.messages }));
        });
      } else {
        grpcStream.write(parsed);
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
    }
  });

  ws.on('close', () => {
    grpcStream.end();
  });
});
