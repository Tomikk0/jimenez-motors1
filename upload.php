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
                } elseif ($result[$field] === true || strtolower((string)$result[$field]) === "van") {
                    $result[$field] = 1;
                } else {
                    $result[$field] = (int)$result[$field];
                }
            }

            $normalizeInt = function ($value) {
                if ($value === null || $value === '') {
                    return 0;
                }

                if (is_numeric($value)) {
                    return (int)$value;
                }

                $filtered = preg_replace('/[^0-9\-]/', '', (string)$value);
                return $filtered === '' ? 0 : (int)$filtered;
            };

            $drivetypeLabel = isset($result['drivetype']) ? $result['drivetype'] : '';
            $result['drivetype_text'] = $drivetypeLabel;
            $result['drivetype'] = (function ($value) {
                if ($value === null) {
                    return 0;
                }

                if (function_exists('iconv')) {
                    $normalized = iconv('UTF-8', 'ASCII//TRANSLIT', (string)$value);
                    if ($normalized === false) {
                        $normalized = (string)$value;
                    }
                } else {
                    $normalized = (string)$value;
                }

                $normalized = strtolower(trim($normalized));

                if ($normalized === '' || $normalized === 'nincs') {
                    return 0;
                }

                if (preg_match('/(4x4|awd|osszkerek|all\s*wheel|mindket|mindketto|osszes)/', $normalized)) {
                    return 3; // összkerék
                }

                if (preg_match('/(hatso|rwd|rear)/', $normalized)) {
                    return 2; // hátsókerék
                }

                if (preg_match('/(elso|fwd|front)/', $normalized)) {
                    return 1; // elsőkerék
                }

                if (is_numeric($normalized)) {
                    return (int)$normalized;
                }

                return 0;
            })($drivetypeLabel);

            $intFields = ['price', 'tuning_points', 'motor_level', 'transmission_level', 'wheel_level', 'chip_level', 'steering_angle', 'drivetype'];
            foreach ($intFields as $intField) {
                if (isset($result[$intField])) {
                    $result[$intField] = $normalizeInt($result[$intField]);
                } else {
                    $result[$intField] = 0;
                }
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
                "sisssiiiiiiiiiiiiiiis",
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
