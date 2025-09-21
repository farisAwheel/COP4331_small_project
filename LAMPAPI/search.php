<?php
// app sends a user id and a search query, api returns list of contacts
$data = json_decode(file_get_contents("php://input"), true); // retrieve body from POST request
$userid = $data["user_id"];
$query = $data["query"];

$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager"); 
if($conn->connect_error) {
    returnError($conn->connect_error, 500);
}
else {
    $stmt = $conn->prepare("SELECT name, phone FROM contacts WHERE user_id = ? AND name LIKE ?");
    $query .= '%';
    $stmt->bind_param("is", $userid, $query);
    $stmt->execute();
    $result = $stmt->get_result();

    if($row = $result->fetch_all(MYSQLI_ASSOC)){
        returnResult($row);
    }
    else {
        returnResult([]);
    }
}

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
    $retValue = ([
        "result" => $result,
        "error" => ""
    ]);
    jsonify($retValue);
}
function returnError($err, $status=400) {
    $retValue = ([
        "result" => [],
        "error" => $err
    ]);
    jsonify($retValue, $status);
}