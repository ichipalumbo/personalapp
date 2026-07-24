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
    const errMsg = '❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada (MONGODB_URI).';
    console.error(errMsg);
    console.error('Variáveis de ambiente disponíveis (sem valores sensíveis):');
    console.error('MONGODB_URI:', process.env.MONGODB_URI ? '✓ definido' : '✗ não definido');
    const error = new Error('MONGODB_URI is required.');
    error.statusCode = 500;
    throw error;
  }

  const cache = globalForMongoose.__mongooseCache;

  if (cache.conn && cache.conn.readyState === 1) {
    return cache.conn;
  }

  if (cache.conn && cache.conn.readyState !== 1) {
    cache.conn = null;
  }

  if (!cache.promise) {
    const cleanURI = mongoURI.replace(/:[^:/@]*@/, ':***@'); // remove senha
    console.log(`📡 Conectando ao MongoDB: ${cleanURI}`);

    cache.promise = mongoose
      .connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
        minPoolSize: 0
      })
      .then((mongooseInstance) => {
        console.log('✅ Conectado ao MongoDB com sucesso!');
        return mongooseInstance.connection;
      })
      .catch((err) => {
        cache.conn = null;
        cache.promise = null;
        console.error('❌ Erro ao conectar ao MongoDB:', err.message);
        console.error('Detalhes:', err);
        throw err;
      });
  }

  const connection = await cache.promise;
  cache.conn = connection;
  return cache.conn;
}

module.exports = {
  connectToDatabase
};
