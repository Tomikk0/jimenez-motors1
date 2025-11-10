<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $targetDir = __DIR__ . "/uploads/";
    if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);

    $uploadedFiles = [];
    foreach ($_FILES['car_images']['tmp_name'] as $key => $tmpName) {
        $filename = basename($_FILES['car_images']['name'][$key]);
        $targetFile = $targetDir . $filename;
        if (move_uploaded_file($tmpName, $targetFile)) {
            $uploadedFiles[] = $targetFile;
        }
    }

    if (count($uploadedFiles) > 0) {
        // Futtatjuk a Python scripet
        $command = "python3 " . __DIR__ . "/process_images.py " . implode(" ", array_map("escapeshellarg", $uploadedFiles));
        $output = shell_exec($command);
        $result = json_decode($output, true);

        if ($result) {
        // Biztonsági konvertálás a logikai mezőkhöz
$boolFields = ['air_ride', 'nitro', 'dark_glass', 'turbo', 'compressor', 'neon', 'colored_lights', 'despawn_protect'];
foreach ($boolFields as $field) {
    if (!isset($result[$field]) || $result[$field] === null || $result[$field] === '') {
        $result[$field] = 0;
    } else if ($result[$field] === true || strtolower((string)$result[$field]) === "van") {
        $result[$field] = 1;
    } else {
        $result[$field] = (int)$result[$field];
    }
}

        if (!isset($result['drivetype']) || $result['drivetype'] === null) {
            $result['drivetype'] = '';
        }
            // Kapcsolódás adatbázishoz
            $conn = new mysqli("localhost", "root", "Root123", "autok");
            if ($conn->connect_error) die("DB hiba: " . $conn->connect_error);

            $stmt = $conn->prepare("
                INSERT INTO cars (car_name, price, engine_condition, seller, phone, tuning_points, motor_level, transmission_level, wheel_level, chip_level, air_ride, steering_angle, nitro, dark_glass, drivetype, turbo, compressor, neon, colored_lights, despawn_protect, main_image)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $mainImage = basename($uploadedFiles[0]); // az első kép a fő kép
            $stmt->bind_param(
                "sisssiiiiiiiiisiiiiis",
                $result['car_name'],
                $result['price'],
                $result['engine_condition'],
                $result['seller'],
                $result['phone'],
                $result['tuning_points'],
                $result['motor_level'],
                $result['transmission_level'],
                $result['wheel_level'],
                $result['chip_level'],
                $result['air_ride'],
                $result['steering_angle'],
                $result['nitro'],
                $result['dark_glass'],
                $result['drivetype'],
                $result['turbo'],
                $result['compressor'],
                $result['neon'],
                $result['colored_lights'],
                $result['despawn_protect'],
                $mainImage
            );
            $stmt->execute();
            $stmt->close();
            $conn->close();

            echo "<h3>✅ Sikeres feltöltés!</h3>";
            echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
        } else {
            echo "⚠️ Hiba a Python script feldolgozásakor!";
        }
    } else {
        echo "⚠️ Nem sikerült feltölteni a képeket!";
    }
}
?>

<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <title>Autófeltöltés</title>
</head>
<body>
    <h2>🚗 Autó feltöltése</h2>
    <form method="POST" enctype="multipart/form-data">
        <label>Töltsd fel az autó képeit (pl. 3 db):</label><br>
        <input type="file" name="car_images[]" multiple required><br><br>
        <button type="submit">Feltöltés</button>
    </form>
</body>
</html>
