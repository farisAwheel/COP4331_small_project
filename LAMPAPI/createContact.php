<?php
// app sends a user id, name, email, and phone number, api creates a contacts
$data = json_decode(file_get_contents("php://input"), true); // retrieve body from POST request
$userid = $data["user_id"];
$name = $data["name"];
$email = $data["email"];
$phone = $data["phone"];


$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager"); 
if($conn->connect_error) {
    returnError($conn->connect_error, 500);
}
else {
    $stmt = $conn->prepare("INSERT INTO contacts (user_id, name, email, phone) VALUES(?, ?, ?, ?)");
    $stmt->bind_param("isss", $userid, $name, $email, $phone);
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
