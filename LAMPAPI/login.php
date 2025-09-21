<?php
/* TODO
    [] implement hashing for password 
    [] implement env variables instead of storing passwords in repo
    [] implement field valdiation b4 performing a query
*/
$data = json_decode(file_get_contents("php://input"), true);

$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager");
if($conn->connect_error) {
    returnError($conn->connect_error);
}
else {
    $stmt = $conn->prepare("SELECT id, email FROM users WHERE username=? AND password=?");
    $stmt->bind_param("ss", $data["username"], $data["password"]);
    $stmt->execute();
    $result = $stmt->get_result();

    if($row = $result->fetch_assoc()){
        returnLogin($row['id'], $row['email']);
    }
    else {
        returnError("No user found");
    }
    
    $stmt->close();
    $conn->close();
}

function jsonify($obj, $status=200){
    header('Content-type: application/json');
    $json = json_encode($obj);
    if($json === false){
        $status = 500;
        $json = json_encode([
           "id" => 0,
           "email" => "",
           "error" => "JSON encoding failed" 
        ]);
    }
    http_response_code($status);
    echo $json;
}
function returnLogin($id, $email){
    $retValue = ([
        "id" => $id,
        "email" => $email,
        "error" => ""
    ]);
    jsonify($retValue);
}
function returnError($err, $status=400) {
    $retValue = ([
        "id" => 0,
        "email" => "",
        "error" => $err
    ]);
    jsonify($retValue, $status);
}