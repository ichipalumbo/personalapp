const mongoose = require('mongoose');

let hasConnectionAttempt = false;

function connectToDatabase(mongoURI) {
  if (!mongoURI) {
    const errMsg = '❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada (MONGODB_URI ou MONGO_URI).';
    console.error(errMsg);
    console.error('Variáveis de ambiente disponíveis (sem valores sensíveis):');
    console.error('MONGODB_URI:', process.env.MONGODB_URI ? '✓ definido' : '✗ não definido');
    console.error('MONGO_URI:', process.env.MONGO_URI ? '✓ definido' : '✗ não definido');
    return null;
  }

  if (hasConnectionAttempt) {
    return mongoose.connection;
  }

  hasConnectionAttempt = true;

  const cleanURI = mongoURI.replace(/:[^:/@]*@/, ':***@'); // remove senha
  console.log(`📡 Conectando ao MongoDB: ${cleanURI}`);

  mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
    .catch(err => {
      console.error('❌ Erro ao conectar ao MongoDB:', err.message);
      console.error('Detalhes:', err);
    });

  return mongoose.connection;
}

module.exports = {
  connectToDatabase
};
