<?php
// app sends a user id, contact id, name, email, and phone, api updates contact with new name, email, and phone
$data = json_decode(file_get_contents("php://input"), true); // retrieve body from POST request
$userid = $data["user_id"];
$id = $data["id"];
$name = $data["name"];
$email = $data["email"];
$phone = $data["phone"];


$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager"); 
if($conn->connect_error) {
    returnError($conn->connect_error, 500);
}
else {
    $stmt = $conn->prepare("UPDATE contacts SET name = ?, email = ?, phone = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("sssii", $name, $email, $phone, $id, $userid);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    returnError("", 200);
}

function jsonify($obj, $status=200){
    header('Content-type: application/json');
    $json = json_encode($obj);
    if($json === false){
        $status = 500;
        $json = json_encode([
           "error" => "JSON encoding failed" 
        ]);
    }
    http_response_code($status);
    echo $json;
}
function returnError($err, $status=400) {
    $retValue = ([
        "error" => $err
    ]);
    jsonify($retValue, $status);
}
