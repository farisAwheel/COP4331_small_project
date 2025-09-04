<?php
$data = json_decode(file_get_contents("php://input"), true); // retrieve body from POST request
$username = $data["username"];
$password = $data["password"];
$email = $data["email"];

// attempt to connec to db
$conn = new mysqli("localhost", "user", "L@MPGroup1A", "contact_manager"); 
if($conn->connect_error) {
    returnError($conn->connect_error);
}
else {
    $stmt = $conn->prepare("INSERT INTO users (username, password, email) VALUES(?, ?, ?)");
    $stmt->bind_param("sss", $username, $password, $email);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    returnError("");
}
