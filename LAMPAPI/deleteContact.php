<?php
// app sends a user id and the contact's id api deletes corresponding contact
$data = json_decode(file_get_contents("php://input"), true); // retrieve body from POST request
$userid = $data["user_id"];
$id = $data["id"];


$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager"); 
if($conn->connect_error) {
    returnError($conn->connect_error, 500);
}
else {
    $stmt = $conn->prepare("DELETE FROM contacts WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $id, $userid);
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
