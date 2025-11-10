<?php
header("Content-Type: application/json");
$mysqli = new mysqli("localhost", "root", "Root123", "autok");

$result = $mysqli->query("SELECT * FROM cars ORDER BY created_at DESC");
$cars = [];

while ($row = $result->fetch_assoc()) {
    $cars[] = $row;
}

echo json_encode($cars);
?>
