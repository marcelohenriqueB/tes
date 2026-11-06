<?php
declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

function responder(int $codigo, array $dados): never
{
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function horarios_do_dia(string $data): array
{
    $fuso = new DateTimeZone('America/Sao_Paulo');
    $dia = DateTimeImmutable::createFromFormat('!Y-m-d', $data, $fuso);
    $erros = DateTimeImmutable::getLastErrors();
    if (!$dia || ($erros !== false && ($erros['warning_count'] || $erros['error_count'])) || $dia->format('Y-m-d') !== $data) {
        return [];
    }
    $hoje = new DateTimeImmutable('today', $fuso);
    if ($dia < $hoje || $dia > $hoje->modify('+90 days')) {
        return [];
    }
    $semana = (int) $dia->format('N');
    if ($semana > 6) {
        return [];
    }
    $limite = $semana === 6 ? 12 * 60 : 17 * 60;
    $horarios = [];
    for ($minuto = 9 * 60; $minuto < $limite; $minuto += 30) {
        $horarios[] = sprintf('%02d:%02d', intdiv($minuto, 60), $minuto % 60);
    }
    return $horarios;
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo === 'GET') {
    $data = (string) ($_GET['data'] ?? '');
    $horarios = horarios_do_dia($data);
    if (!$horarios) {
        responder(200, ['horarios' => []]);
    }
    require __DIR__ . '/biglink-db.php';
    $pdo = biglink_db();
    $consulta = $pdo->prepare('SELECT DATE_FORMAT(data_hora, "%H:%i") AS hora FROM agendamentos WHERE DATE(data_hora) = ?');
    $consulta->execute([$data]);
    $ocupados = array_column($consulta->fetchAll(), 'hora');
    $agora = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
    $livres = array_values(array_filter($horarios, static function (string $hora) use ($data, $ocupados, $agora): bool {
        $momento = new DateTimeImmutable($data . ' ' . $hora, new DateTimeZone('America/Sao_Paulo'));
        return $momento > $agora && !in_array($hora, $ocupados, true);
    }));
    responder(200, ['horarios' => $livres]);
}

if ($metodo !== 'POST') {
    header('Allow: GET, POST');
    responder(405, ['erro' => 'Método não permitido.']);
}

$entrada = json_decode(file_get_contents('php://input'), true);
if (!is_array($entrada)) {
    responder(400, ['erro' => 'Não foi possível ler os dados enviados.']);
}
if (!empty($entrada['site'])) {
    responder(200, ['mensagem' => 'Recebemos seu pedido.']);
}

$nome = trim((string) ($entrada['nome'] ?? ''));
$pet = trim((string) ($entrada['pet'] ?? ''));
$telefone = trim((string) ($entrada['telefone'] ?? ''));
$servico = trim((string) ($entrada['servico'] ?? ''));
$data = trim((string) ($entrada['data'] ?? ''));
$hora = trim((string) ($entrada['horario'] ?? ''));
$servicos = ['Consulta e prevenção', 'Vacinação', 'Orientação para tutores'];
if ($nome === '' || strlen($nome) > 120 || $pet === '' || strlen($pet) > 80 || $telefone === '' || strlen($telefone) > 30 || !in_array($servico, $servicos, true) || !in_array($hora, horarios_do_dia($data), true)) {
    responder(422, ['erro' => 'Confira os dados e escolha um horário válido.']);
}

$momento = new DateTimeImmutable($data . ' ' . $hora, new DateTimeZone('America/Sao_Paulo'));
if ($momento <= new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'))) {
    responder(422, ['erro' => 'Esse horário já passou. Escolha outro, por favor.']);
}

try {
    require __DIR__ . '/biglink-db.php';
    $pdo = biglink_db();
    $inserir = $pdo->prepare('INSERT INTO agendamentos (nome, pet, telefone, servico, data_hora) VALUES (?, ?, ?, ?, ?)');
    $inserir->execute([$nome, $pet, $telefone, $servico, $momento->format('Y-m-d H:i:s')]);
    responder(201, ['mensagem' => 'Agendamento confirmado para ' . $momento->format('d/m/Y') . ' às ' . $momento->format('H:i') . '.']);
} catch (PDOException $erro) {
    if ($erro->getCode() === '23000') {
        responder(409, ['erro' => 'Esse horário acabou de ser reservado. Escolha outro horário disponível.']);
    }
    responder(500, ['erro' => 'Não foi possível concluir agora. Tente novamente mais tarde.']);
}
