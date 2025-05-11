const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
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

const admin = {
  id: "admin",
  name: "Grpc_Admin",
  email: "grpc_admin@mail.com",
  status: "ACTIVE",
};

const chatHistory = [];

function getUser(call, callback) {
  const userId = call.request.user_id;
  const user = { ...admin, id: userId };
  callback(null, { user });
}

function chat(call) {
  call.on('data', (chatStreamMessage) => {
    if (chatStreamMessage.chat_message) {
      const msg = chatStreamMessage.chat_message;
      chatHistory.push(msg);
      const reply = {
        id: msg.id + "_reply",
        room_id: msg.room_id,
        sender_id: admin.name,
        content: "received at " + new Date().toISOString(),
      };
      call.write({ chat_message: reply });
    }
  });

  call.on('end', () => {
    call.end();
  });
}

function getChatHistory(call, callback) {
  callback(null, { messages: chatHistory });
}

function main() {
  const server = new grpc.Server();
  server.addService(chatProto.ChatService.service, {
    GetUser: getUser,
    Chat: chat,
    GetChatHistory: getChatHistory,
  });
  const address = '0.0.0.0:50051';
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`Serveur gRPC en écoute sur ${address}`);
  });
}

main();
