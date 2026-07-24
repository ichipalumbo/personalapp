const mongoose = require('mongoose');

const globalForMongoose = global;

if (!globalForMongoose.__mongooseCache) {
  globalForMongoose.__mongooseCache = {
    conn: null,
    promise: null
  };
}

async function connectToDatabase(mongoURI) {
  if (!mongoURI) {
    const errMsg = '❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada (MONGODB_URI ou MONGO_URI).';
    console.error(errMsg);
    console.error('Variáveis de ambiente disponíveis (sem valores sensíveis):');
    console.error('MONGODB_URI:', process.env.MONGODB_URI ? '✓ definido' : '✗ não definido');
    console.error('MONGO_URI:', process.env.MONGO_URI ? '✓ definido' : '✗ não definido');
    return null;
  }

  const cache = globalForMongoose.__mongooseCache;

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const cleanURI = mongoURI.replace(/:[^:/@]*@/, ':***@'); // remove senha
    console.log(`📡 Conectando ao MongoDB: ${cleanURI}`);

    cache.promise = mongoose
      .connect(mongoURI)
      .then((mongooseInstance) => {
        console.log('✅ Conectado ao MongoDB com sucesso!');
        return mongooseInstance.connection;
      })
      .catch((err) => {
        cache.promise = null;
        console.error('❌ Erro ao conectar ao MongoDB:', err.message);
        console.error('Detalhes:', err);
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

module.exports = {
  connectToDatabase
};
