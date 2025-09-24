<?php
// app sends a user id and a search query, api returns list of contacts (partial match across name/email/phone)
$data = json_decode(file_get_contents("php://input"), true); // retrieve body from POST request

$userid = isset($data["user_id"]) ? intval($data["user_id"]) : 0;
$query  = isset($data["query"]) ? trim((string)$data["query"]) : "";

// Basic guard
if ($userid <= 0) {
    returnError("Invalid user.", 400);
    exit;
}

$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager");
if ($conn->connect_error) {
    returnError($conn->connect_error, 500);
    exit;
}
$conn->set_charset("utf8mb4");

// Build partial-match pattern (will match all if query is empty)
$like = '%' . $query . '%';

// NOTE: search on name OR email OR phone, scoped by user_id
$sql = "SELECT id, name, email, phone
        FROM contacts
        WHERE user_id = ?
          AND (name  LIKE ?
               OR email LIKE ?
               OR phone LIKE ?)
        ORDER BY name ASC, id ASC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    returnError($conn->error, 500);
    $conn->close();
    exit;
}

$stmt->bind_param("isss", $userid, $like, $like, $like);
$stmt->execute();
$result = $stmt->get_result();

$rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];

returnResult($rows);

$stmt->close();
$conn->close();

function jsonify($obj, $status=200){
    header('Content-type: application/json');
    $json = json_encode($obj);
    if($json === false){
        $status = 500;
        $json = json_encode([
            "result" => [],
            "error" => "JSON encoding failed"
        ]);
    }
    http_response_code($status);
    echo $json;
}
function returnResult($result){
    $retValue = [
        "result" => $result,
        "error" => ""
    ];
    jsonify($retValue);
}
function returnError($err, $status=400) {
    $retValue = [
        "result" => [],
        "error" => $err
    ];
    jsonify($retValue, $status);
}