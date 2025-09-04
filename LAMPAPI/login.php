<?php
/* TODO
    [] implement hashing for password 
    [] implement env variables instead of storing passwords in repo
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
        returnError("notFound");
    }
}

function jsonify($obj){
    header('Content-type: application/json');
    echo $obj;
}
function returnLogin($id, $email){
    $retValue = '{"id":' . $id . ',"email":"' . $email . ',"error":""}';
    jsonify($retValue);
}
function returnError($err) {
    $retValue = '{"id":0, "email": "", "error":"' . $err . '"}';
    jsonify($retValue);
}