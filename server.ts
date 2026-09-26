import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const rootDir = process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json());

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

let activeDbConfig: DbConfig = {
  host: process.env.HOSTINGER_DB_HOST || '',
  port: parseInt(process.env.HOSTINGER_DB_PORT || '3306', 10),
  user: process.env.HOSTINGER_DB_USER || '',
  password: process.env.HOSTINGER_DB_PASSWORD || '',
  database: process.env.HOSTINGER_DB_NAME || '',
  ssl: process.env.HOSTINGER_DB_SSL === 'true',
};

let pool: mysql.Pool | null = null;
let lastDbError: string | null = null;
let isConnected = false;

function getPool(config: DbConfig): mysql.Pool {
  return mysql.createPool({
    host: config.host,
    port: config.port || 3306,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8000,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });
}

async function initTables(p: mysql.Pool) {
  const conn = await p.getConnection();
  try {
    // Tabela de usuários
    await conn.query(`
      CREATE TABLE IF NOT EXISTS claro_users (
        id VARCHAR(64) PRIMARY KEY,
        login VARCHAR(64) NOT NULL UNIQUE,
        nome VARCHAR(128) NOT NULL,
        senha VARCHAR(128) NOT NULL,
        perfil VARCHAR(32) NOT NULL,
        coordenador_id VARCHAR(64),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Inserir ou atualizar ADMIN master padrão
    await conn.query(`
      INSERT INTO claro_users (id, login, nome, senha, perfil)
      VALUES ('admin-master', 'ADMIN', 'Administrador Master', 'C.1985.w', 'admin')
      ON DUPLICATE KEY UPDATE senha = 'C.1985.w', perfil = 'admin';
    `);

    // Tabela de desempenho / indicadores
    await conn.query(`
      CREATE TABLE IF NOT EXISTS claro_performance (
        id VARCHAR(128) PRIMARY KEY,
        executivo_id VARCHAR(64) NOT NULL,
        mes VARCHAR(16) NOT NULL,
        sales_json LONGTEXT NOT NULL,
        quality_json LONGTEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_exec_mes (executivo_id, mes)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } finally {
    conn.release();
  }
}

async function tryConnect(config: DbConfig): Promise<{ success: boolean; message: string }> {
  if (!config.host || !config.user || !config.database) {
    return { success: false, message: 'Parâmetros incompletos de conexão (Host, Usuário e Banco são obrigatórios).' };
  }

  const testPool = getPool(config);
  try {
    const conn = await testPool.getConnection();
    try {
      await conn.ping();
      await initTables(testPool);
    } finally {
      conn.release();
    }
    
    // Atualiza pool ativo
    if (pool) {
      await pool.end().catch(() => {});
    }
    pool = testPool;
    activeDbConfig = { ...config };
    isConnected = true;
    lastDbError = null;
    return { success: true, message: 'Conexão com o banco Hostinger realizada com sucesso e tabelas verificadas!' };
  } catch (err: any) {
    let msg = err?.message || 'Erro desconhecido ao conectar ao MySQL.';
    if (err?.code === 'ETIMEDOUT') {
      msg = 'Tempo limite esgotado. Lembre-se de liberar o "MySQL Remoto" no hPanel da Hostinger adicionando o IP ou "%" (qualquer IP).';
    } else if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
      msg = 'Acesso negado: Verifique se o Usuário, Senha e Nome do Banco de Dados estão corretos no painel da Hostinger.';
    } else if (err?.code === 'ENOTFOUND') {
      msg = `Host "${config.host}" não encontrado. Verifique o endereço do servidor MySQL no hPanel da Hostinger.`;
    }
    lastDbError = msg;
    isConnected = false;
    return { success: false, message: msg };
  }
}

// Iniciar conexão se variáveis de ambiente estiverem presentes
if (activeDbConfig.host && activeDbConfig.user && activeDbConfig.database) {
  tryConnect(activeDbConfig).then(res => {
    console.log(`[Hostinger DB]: ${res.message}`);
  }).catch(e => console.error('[Hostinger DB Init Error]:', e));
}

// --- ROTAS DA API ---

// Suporte para chamadas diretas a /api.php (compatibilidade com ambientes PHP/Hostinger)
app.use((req: Request, res: Response, next) => {
  if (req.path === '/api.php') {
    const endpoint = req.query.endpoint as string;
    if (!endpoint) {
      return res.json({ status: 'ok', server: 'Node Express Proxy', time: new Date().toISOString() });
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    req.url = `/${cleanEndpoint.startsWith('api/') ? cleanEndpoint : 'api/' + cleanEndpoint}`;
  }
  next();
});

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Status do Banco Hostinger
app.get('/api/db/status', (req: Request, res: Response) => {
  res.json({
    connected: isConnected,
    config: {
      host: activeDbConfig.host,
      port: activeDbConfig.port,
      user: activeDbConfig.user,
      database: activeDbConfig.database,
      ssl: activeDbConfig.ssl,
      hasPassword: !!activeDbConfig.password,
    },
    lastError: lastDbError,
  });
});

// 3. Testar conexão com Hostinger
app.post('/api/db/test', async (req: Request, res: Response) => {
  const { host, port, user, password, database, ssl } = req.body;
  const result = await tryConnect({
    host: host || '',
    port: parseInt(port || '3306', 10),
    user: user || '',
    password: password || '',
    database: database || '',
    ssl: Boolean(ssl),
  });
  res.json(result);
});

// 4. Salvar configuração e conectar
app.post('/api/db/config', async (req: Request, res: Response) => {
  const { host, port, user, password, database, ssl } = req.body;
  const configToApply: DbConfig = {
    host: host?.trim() || '',
    port: parseInt(port || '3306', 10),
    user: user?.trim() || '',
    password: password !== undefined ? password : activeDbConfig.password,
    database: database?.trim() || '',
    ssl: Boolean(ssl),
  };

  const result = await tryConnect(configToApply);
  res.json({
    ...result,
    connected: isConnected,
  });
});

// 5. Usuários - Listar
app.get('/api/users', async (req: Request, res: Response) => {
  if (!isConnected || !pool) {
    return res.json({ connected: false, users: null });
  }

  try {
    const [rows]: any = await pool.query(`
      SELECT id, login, nome, senha, perfil, coordenador_id as coordenadorId, created_at as createdAt
      FROM claro_users
      ORDER BY created_at ASC
    `);
    res.json({ connected: true, users: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message, connected: false });
  }
});

// 6. Usuários - Criar
app.post('/api/users', async (req: Request, res: Response) => {
  const { id, login, nome, senha, perfil, coordenadorId } = req.body;
  if (!login || !nome || !senha || !perfil) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  const userId = id || `user-${Date.now()}`;

  if (isConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO claro_users (id, login, nome, senha, perfil, coordenador_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, login, nome, senha, perfil, coordenadorId || null]
      );
      return res.json({ success: true, id: userId, message: 'Usuário cadastrado com sucesso no banco Hostinger.' });
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Este login já existe no banco de dados.' });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  // Se não estiver conectado, responde sucesso para persistência local
  res.json({ success: true, id: userId, message: 'Salvo localmente (banco Hostinger não conectado).' });
});

// 7. Usuários - Atualizar
app.put('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { login, nome, senha, perfil, coordenadorId } = req.body;

  if (isConnected && pool) {
    try {
      await pool.query(
        `UPDATE claro_users SET login = ?, nome = ?, senha = ?, perfil = ?, coordenador_id = ? WHERE id = ?`,
        [login, nome, senha, perfil, coordenadorId || null, id]
      );
      return res.json({ success: true, message: 'Usuário atualizado no banco Hostinger.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ success: true, message: 'Atualizado localmente.' });
});

// 8. Usuários - Excluir
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isConnected && pool) {
    try {
      const [result]: any = await pool.query(`DELETE FROM claro_users WHERE id = ?`, [id]);
      return res.json({ success: true, affectedRows: result.affectedRows, message: 'Usuário excluído do banco Hostinger.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ success: true, message: 'Excluído localmente.' });
});

// 9. Performance - Obter
app.get('/api/performance/:executivoId/:mes', async (req: Request, res: Response) => {
  const { executivoId, mes } = req.params;

  if (!isConnected || !pool) {
    return res.json({ record: null });
  }

  try {
    const [rows]: any = await pool.query(
      `SELECT executivo_id as executivoId, mes, sales_json as salesJson, quality_json as qualityJson, updated_at as updatedAt
       FROM claro_performance WHERE executivo_id = ? AND mes = ? LIMIT 1`,
      [executivoId, mes]
    );

    if (rows.length === 0) {
      return res.json({ record: null });
    }

    const row = rows[0];
    res.json({
      record: {
        executivoId: row.executivoId,
        mes: row.mes,
        salesIndicators: JSON.parse(row.salesJson),
        qualityIndicators: JSON.parse(row.qualityJson),
        updatedAt: row.updatedAt,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Performance - Salvar
app.post('/api/performance', async (req: Request, res: Response) => {
  const { executivoId, mes, salesIndicators, qualityIndicators } = req.body;

  if (!executivoId || !mes) {
    return res.status(400).json({ error: 'Executivo e Mês são obrigatórios.' });
  }

  if (isConnected && pool) {
    try {
      const recId = `${executivoId}_${mes}`;
      const salesStr = JSON.stringify(salesIndicators || []);
      const qualityStr = JSON.stringify(qualityIndicators || []);

      await pool.query(
        `INSERT INTO claro_performance (id, executivo_id, mes, sales_json, quality_json)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE sales_json = VALUES(sales_json), quality_json = VALUES(quality_json), updated_at = NOW()`,
        [recId, executivoId, mes, salesStr, qualityStr]
      );

      return res.json({ success: true, message: 'Performance salva no banco Hostinger.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ success: true, message: 'Performance salva localmente.' });
});

// 11. Sincronização em Lote (importar dados locais para o banco Hostinger)
app.post('/api/db/sync', async (req: Request, res: Response) => {
  if (!isConnected || !pool) {
    return res.status(400).json({ error: 'Banco Hostinger não está conectado.' });
  }

  const { users, records } = req.body;
  try {
    let syncedUsers = 0;
    if (Array.isArray(users)) {
      for (const u of users) {
        await pool.query(
          `INSERT INTO claro_users (id, login, nome, senha, perfil, coordenador_id)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE login = VALUES(login), nome = VALUES(nome), senha = VALUES(senha), perfil = VALUES(perfil), coordenador_id = VALUES(coordenador_id)`,
          [u.id, u.login, u.nome, u.senha, u.perfil, u.coordenadorId || null]
        );
        syncedUsers++;
      }
    }

    let syncedRecords = 0;
    if (Array.isArray(records)) {
      for (const r of records) {
        const recId = `${r.executivoId}_${r.mes}`;
        await pool.query(
          `INSERT INTO claro_performance (id, executivo_id, mes, sales_json, quality_json)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE sales_json = VALUES(sales_json), quality_json = VALUES(quality_json), updated_at = NOW()`,
          [recId, r.executivoId, r.mes, JSON.stringify(r.salesIndicators || []), JSON.stringify(r.qualityIndicators || [])]
        );
        syncedRecords++;
      }
    }

    res.json({ success: true, syncedUsers, syncedRecords, message: 'Sincronização concluída com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start server with Vite middleware in development or static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
