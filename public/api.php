<?php
/**
 * API Backend em PHP para Hostinger (MySQL)
 * Simulador de Performance Claro
 * 
 * Permite que a aplicação React funcione diretamente na hospedagem web da Hostinger
 * conectando ao banco de dados MySQL da Hostinger.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$configFile = __DIR__ . '/claro_db_config.json';

// Função para obter conexão PDO
function getDbConnection($config) {
    $host = $config['host'] ?? 'localhost';
    $port = $config['port'] ?? 3306;
    $dbname = $config['database'] ?? '';
    $user = $config['user'] ?? '';
    $pass = $config['password'] ?? '';

    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 6,
    ];

    try {
        return new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        // Se o host configurado falhar e for diferente de localhost, tenta localhost (comum na Hostinger quando o script roda no próprio servidor)
        if ($host !== 'localhost' && $host !== '127.0.0.1') {
            try {
                $dsnLocal = "mysql:host=localhost;port={$port};dbname={$dbname};charset=utf8mb4";
                return new PDO($dsnLocal, $user, $pass, $options);
            } catch (PDOException $e2) {
                // mantém o erro original
            }
        }
        throw $e;
    }
}

// Inicializar tabelas
function initTables($pdo) {
    $pdo->exec("
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
    ");

    // Inserir Administrador Master padrão caso não exista
    $stmt = $pdo->prepare("
        INSERT INTO claro_users (id, login, nome, senha, perfil)
        VALUES ('admin-master', 'ADMIN', 'Administrador Master', 'C.1985.w', 'admin')
        ON DUPLICATE KEY UPDATE senha = 'C.1985.w', perfil = 'admin'
    ");
    $stmt->execute();

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS claro_performance (
            id VARCHAR(128) PRIMARY KEY,
            executivo_id VARCHAR(64) NOT NULL,
            mes VARCHAR(16) NOT NULL,
            sales_json LONGTEXT NOT NULL,
            quality_json LONGTEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_exec_mes (executivo_id, mes)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
}

// Ler config salva
function loadConfig($configFile) {
    if (file_exists($configFile)) {
        $content = file_get_contents($configFile);
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return null;
}

// Roteador de endpoints
$endpoint = $_GET['endpoint'] ?? '';
if (!$endpoint && isset($_SERVER['PATH_INFO'])) {
    $endpoint = trim($_SERVER['PATH_INFO'], '/');
}
if (!$endpoint && isset($_SERVER['REQUEST_URI'])) {
    $uriParts = explode('?', $_SERVER['REQUEST_URI']);
    $path = trim($uriParts[0], '/');
    if (strpos($path, 'api/') === 0) {
        $endpoint = substr($path, 4);
    } elseif ($path === 'api') {
        $endpoint = '';
    }
}

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?: [];

// Normalizar endpoint (ex: 'db/status', 'users/123', 'performance/exec/09')
$endpoint = trim($endpoint, '/');

// 1. Health check
if ($endpoint === 'health' || $endpoint === '') {
    echo json_encode([
        'status' => 'ok',
        'server' => 'Hostinger PHP Server',
        'php_version' => phpversion(),
        'time' => date('c')
    ]);
    exit;
}

// 2. Status do banco
if ($endpoint === 'db/status') {
    $config = loadConfig($configFile);
    if (!$config || empty($config['host']) || empty($config['user']) || empty($config['database'])) {
        echo json_encode([
            'connected' => false,
            'config' => $config ? [
                'host' => $config['host'] ?? '',
                'port' => $config['port'] ?? 3306,
                'user' => $config['user'] ?? '',
                'database' => $config['database'] ?? '',
                'hasPassword' => !empty($config['password']),
            ] : null,
            'lastError' => 'Configuração do banco ainda não preenchida na Hostinger.'
        ]);
        exit;
    }

    try {
        $pdo = getDbConnection($config);
        initTables($pdo);
        echo json_encode([
            'connected' => true,
            'config' => [
                'host' => $config['host'],
                'port' => $config['port'] ?? 3306,
                'user' => $config['user'],
                'database' => $config['database'],
                'hasPassword' => !empty($config['password']),
            ],
            'lastError' => null
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'connected' => false,
            'config' => [
                'host' => $config['host'],
                'port' => $config['port'] ?? 3306,
                'user' => $config['user'],
                'database' => $config['database'],
                'hasPassword' => !empty($config['password']),
            ],
            'lastError' => $e->getMessage()
        ]);
    }
    exit;
}

// 3. Testar conexão
if ($endpoint === 'db/test') {
    $host = trim($body['host'] ?? '');
    $user = trim($body['user'] ?? '');
    $database = trim($body['database'] ?? '');
    $password = $body['password'] ?? '';
    $port = (int)($body['port'] ?? 3306);

    if (!$host || !$user || !$database) {
        echo json_encode([
            'success' => false,
            'message' => 'Parâmetros incompletos (Host, Usuário e Banco são obrigatórios).'
        ]);
        exit;
    }

    try {
        $testConfig = [
            'host' => $host,
            'user' => $user,
            'password' => $password,
            'database' => $database,
            'port' => $port
        ];
        $pdo = getDbConnection($testConfig);
        initTables($pdo);
        echo json_encode([
            'success' => true,
            'message' => 'Conexão com o banco Hostinger realizada com sucesso e tabelas verificadas!'
        ]);
    } catch (Exception $e) {
        $msg = $e->getMessage();
        if (strpos($msg, 'Access denied') !== false) {
            $msg = 'Acesso negado: Usuário ou senha incorretos para o banco da Hostinger.';
        } elseif (strpos($msg, 'Unknown database') !== false) {
            $msg = 'Banco de dados não encontrado. Verifique o nome do banco no hPanel da Hostinger.';
        } elseif (strpos($msg, 'Connection refused') !== false || strpos($msg, 'timed out') !== false) {
            $msg = 'Não foi possível conectar ao host MySQL da Hostinger. Se estiver rodando na Hostinger, tente "localhost" ou habilite MySQL Remoto.';
        }
        echo json_encode(['success' => false, 'message' => $msg]);
    }
    exit;
}

// 4. Salvar configuração e conectar
if ($endpoint === 'db/config') {
    $existing = loadConfig($configFile) ?: [];
    $host = trim($body['host'] ?? '');
    $user = trim($body['user'] ?? '');
    $database = trim($body['database'] ?? '');
    $password = isset($body['password']) && $body['password'] !== '' ? $body['password'] : ($existing['password'] ?? '');
    $port = (int)($body['port'] ?? 3306);

    if (!$host || !$user || !$database) {
        echo json_encode([
            'success' => false,
            'connected' => false,
            'message' => 'Preencha Host, Usuário e Banco de Dados.'
        ]);
        exit;
    }

    $newConfig = [
        'host' => $host,
        'user' => $user,
        'password' => $password,
        'database' => $database,
        'port' => $port,
        'updated_at' => date('c')
    ];

    try {
        $pdo = getDbConnection($newConfig);
        initTables($pdo);
        // Salvar configuração com permissões restritas
        file_put_contents($configFile, json_encode($newConfig, JSON_PRETTY_PRINT));
        @chmod($configFile, 0600);

        echo json_encode([
            'success' => true,
            'connected' => true,
            'message' => 'Configuração salva e banco Hostinger ativado com sucesso!'
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'connected' => false,
            'message' => 'Falha ao conectar: ' . $e->getMessage()
        ]);
    }
    exit;
}

// Demais endpoints requerem banco configurado
$config = loadConfig($configFile);
$pdo = null;
if ($config) {
    try {
        $pdo = getDbConnection($config);
    } catch (Exception $e) {
        $pdo = null;
    }
}

// 5. Usuários - Listar (GET users) ou Criar (POST users)
if ($endpoint === 'users') {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (!$pdo) {
            echo json_encode(['connected' => false, 'users' => null]);
            exit;
        }
        try {
            $stmt = $pdo->query("SELECT id, login, nome, senha, perfil, coordenador_id as coordenadorId, created_at as createdAt FROM claro_users ORDER BY created_at ASC");
            $users = $stmt->fetchAll();
            echo json_encode(['connected' => true, 'users' => $users]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['connected' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    if ($method === 'POST') {
        $login = $body['login'] ?? '';
        $nome = $body['nome'] ?? '';
        $senha = $body['senha'] ?? '';
        $perfil = $body['perfil'] ?? '';
        $coordenadorId = $body['coordenadorId'] ?? null;
        $id = $body['id'] ?? ('user-' . round(microtime(true) * 1000));

        if (!$login || !$nome || !$senha || !$perfil) {
            http_response_code(400);
            echo json_encode(['error' => 'Campos obrigatórios ausentes.']);
            exit;
        }

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("INSERT INTO claro_users (id, login, nome, senha, perfil, coordenador_id) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$id, $login, $nome, $senha, $perfil, $coordenadorId ?: null]);
                echo json_encode(['success' => true, 'id' => $id, 'message' => 'Usuário cadastrado com sucesso no banco Hostinger.']);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    http_response_code(409);
                    echo json_encode(['error' => 'Este login já existe no banco de dados.']);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => $e->getMessage()]);
                }
            }
            exit;
        }

        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Salvo localmente (banco Hostinger não conectado).']);
        exit;
    }
}

// 6. Usuários - Atualizar ou Excluir (/users/:id)
if (preg_match('#^users/([^/]+)$#', $endpoint, $matches)) {
    $userId = $matches[1];
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'PUT') {
        $login = $body['login'] ?? '';
        $nome = $body['nome'] ?? '';
        $senha = $body['senha'] ?? '';
        $perfil = $body['perfil'] ?? '';
        $coordenadorId = $body['coordenadorId'] ?? null;

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE claro_users SET login = ?, nome = ?, senha = ?, perfil = ?, coordenador_id = ? WHERE id = ?");
                $stmt->execute([$login, $nome, $senha, $perfil, $coordenadorId ?: null, $userId]);
                echo json_encode(['success' => true, 'message' => 'Usuário atualizado no banco Hostinger.']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
            exit;
        }
        echo json_encode(['success' => true, 'message' => 'Atualizado localmente.']);
        exit;
    }

    if ($method === 'DELETE') {
        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM claro_users WHERE id = ?");
                $stmt->execute([$userId]);
                echo json_encode(['success' => true, 'message' => 'Usuário excluído do banco Hostinger.']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
            exit;
        }
        echo json_encode(['success' => true, 'message' => 'Excluído localmente.']);
        exit;
    }
}

// 7. Performance - Obter (/performance/:executivoId/:mes)
if (preg_match('#^performance/([^/]+)/([^/]+)$#', $endpoint, $matches)) {
    $executivoId = $matches[1];
    $mes = $matches[2];

    if (!$pdo) {
        echo json_encode(['record' => null]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT executivo_id as executivoId, mes, sales_json as salesJson, quality_json as qualityJson, updated_at as updatedAt FROM claro_performance WHERE executivo_id = ? AND mes = ? LIMIT 1");
        $stmt->execute([$executivoId, $mes]);
        $row = $stmt->fetch();

        if (!$row) {
            echo json_encode(['record' => null]);
            exit;
        }

        echo json_encode([
            'record' => [
                'executivoId' => $row['executivoId'],
                'mes' => $row['mes'],
                'salesIndicators' => json_decode($row['salesJson'], true) ?: [],
                'qualityIndicators' => json_decode($row['qualityJson'], true) ?: [],
                'updatedAt' => $row['updatedAt']
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// 8. Performance - Salvar (POST performance)
if ($endpoint === 'performance') {
    $executivoId = $body['executivoId'] ?? '';
    $mes = $body['mes'] ?? '';
    $salesIndicators = $body['salesIndicators'] ?? [];
    $qualityIndicators = $body['qualityIndicators'] ?? [];

    if (!$executivoId || !$mes) {
        http_response_code(400);
        echo json_encode(['error' => 'Executivo e Mês são obrigatórios.']);
        exit;
    }

    if ($pdo) {
        try {
            $recId = "{$executivoId}_{$mes}";
            $salesStr = json_encode($salesIndicators);
            $qualityStr = json_encode($qualityIndicators);

            $stmt = $pdo->prepare("
                INSERT INTO claro_performance (id, executivo_id, mes, sales_json, quality_json)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE sales_json = VALUES(sales_json), quality_json = VALUES(quality_json), updated_at = NOW()
            ");
            $stmt->execute([$recId, $executivoId, $mes, $salesStr, $qualityStr]);
            echo json_encode(['success' => true, 'message' => 'Performance salva no banco Hostinger.']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Performance salva localmente.']);
    exit;
}

// 9. Sincronização em lote (/db/sync)
if ($endpoint === 'db/sync') {
    if (!$pdo) {
        http_response_code(400);
        echo json_encode(['error' => 'Banco Hostinger não está conectado.']);
        exit;
    }

    $users = $body['users'] ?? [];
    $records = $body['records'] ?? [];
    $syncedUsers = 0;
    $syncedRecords = 0;

    try {
        $stmtU = $pdo->prepare("
            INSERT INTO claro_users (id, login, nome, senha, perfil, coordenador_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE login = VALUES(login), nome = VALUES(nome), senha = VALUES(senha), perfil = VALUES(perfil), coordenador_id = VALUES(coordenador_id)
        ");
        foreach ($users as $u) {
            $stmtU->execute([
                $u['id'],
                $u['login'],
                $u['nome'],
                $u['senha'],
                $u['perfil'],
                $u['coordenadorId'] ?? null
            ]);
            $syncedUsers++;
        }

        $stmtR = $pdo->prepare("
            INSERT INTO claro_performance (id, executivo_id, mes, sales_json, quality_json)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE sales_json = VALUES(sales_json), quality_json = VALUES(quality_json), updated_at = NOW()
        ");
        foreach ($records as $r) {
            $recId = "{$r['executivoId']}_{$r['mes']}";
            $stmtR->execute([
                $recId,
                $r['executivoId'],
                $r['mes'],
                json_encode($r['salesIndicators'] ?? []),
                json_encode($r['qualityIndicators'] ?? [])
            ]);
            $syncedRecords++;
        }

        echo json_encode([
            'success' => true,
            'syncedUsers' => $syncedUsers,
            'syncedRecords' => $syncedRecords,
            'message' => 'Sincronização concluída com sucesso!'
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// 404 Endpoint não encontrado
http_response_code(404);
echo json_encode([
    'error' => 'Endpoint não encontrado',
    'endpoint' => $endpoint
]);
