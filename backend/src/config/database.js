const mongoose = require('mongoose');

let hasConnectionAttempt = false;

function connectToDatabase(mongoURI) {
  if (!mongoURI) {
    console.error('❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada (MONGODB_URI ou MONGO_URI).');
    return null;
  }

  if (hasConnectionAttempt) {
    return mongoose.connection;
  }

  hasConnectionAttempt = true;

  mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

  return mongoose.connection;
}

module.exports = {
  connectToDatabase
};
