const sqlite3 = require("sqlite3").verbose();

// Cria a conexão com o banco de dados
const db = new sqlite3.Database("./rides.db", (err: { message: any }) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err.message);
  } else {
    console.log("Conectado ao banco de dados SQLite.");
  }
});

// Criação das tabelas, se ainda não existirem
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS drivers`);
  db.run(`DROP TABLE IF EXISTS rides`);

  db.run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT NOT NULL DEFAULT '',
      vehicle VARCHAR(100),
      avaliacao FLOAT DEFAULT 5.0,
      taxa FLOAT DEFAULT 1.0,
      kmMin FLOAT DEFAULT 0.0
    )
  `);

  db.run(`
    INSERT INTO drivers (id, nome, descricao, vehicle, avaliacao, taxa, kmMin) VALUES
    ('1', "Hommer Simpson", 'Hommer comedor de rosquinhas, bebedor de Duff e motorista.', 'Fiat Uno - Azul', 4.8, 2.5, 1.0),
    ('2', "Marge Simpson", 'Marge mãe de família, dona de casa e motorista.', 'Honda Civic - Preto', 4.7, 5.0, 10.0),
    ('3', "Bart Simpson", 'Bart o garoto travesso, estudante e motorista.', 'Ford Focus - Vermelho', 4.9, 4.0, 5.0),
    ('4', "Lisa Simpson", 'Lisa a inteligente, saxofonista e motorista.', 'Chevrolet Onix - Branco', 4.9, 3.5, 3.0),
    ('5', "Maggie Simpson", 'Maggie a bebê, chupadora de chupeta e motorista.', 'Fiat Palio - Amarelo', 4.6, 2.0, 200);
    ON CONFLICT DO NOTHING
    `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin REAL NOT NULL,
      destination REAL NOT NULL,
      duration STRING NOT NULL,
      driver_id INTEGER NOT NULL,
      value REAL NOT NULL,
      FOREIGN KEY(driver_id) REFERENCES drivers(id)
    )
  `);
});

module.exports = db;
