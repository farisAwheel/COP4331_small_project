<?php
/* TODO
    [] implement field validation b4 performing a query
*/
$data = json_decode(file_get_contents("php://input"), true);
$username = $data["username"];
$password = $data["password"];
$email = $data["email"];

$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager"); 
if($conn->connect_error) {
    returnError($conn->connect_error, 500);
}
else {
    $stmt = $conn->prepare("INSERT INTO users (username, password, email) VALUES(?, ?, ?)");
    $stmt->bind_param("sss", $username, $password, $email);
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
