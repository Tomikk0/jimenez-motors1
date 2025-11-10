<?php
// car.php - autó részletek oldala
$mysqli = new mysqli("localhost", "root", "Root123", "autok");
if ($mysqli->connect_error) {
    die("❌ Adatbázis hiba: " . $mysqli->connect_error);
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$result = $mysqli->query("SELECT * FROM cars WHERE id = $id LIMIT 1");

if (!$result || $result->num_rows === 0) {
    echo "<h2 style='text-align:center;margin-top:50px;color:#ff6b6b;'>🚫 Nincs ilyen autó az adatbázisban!</h2>";
    exit;
}

$car = $result->fetch_assoc();
$mysqli->close();
?>
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($car['car_name']) ?> - Autó részletek</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #0d1117;
            color: #e6edf3;
            font-family: 'Segoe UI', sans-serif;
        }
        .card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 16px;
            padding: 20px;
            margin-top: 30px;
        }
        .car-img {
            width: 100%;
            border-radius: 16px;
            margin-bottom: 20px;
        }
        .price {
            color: #39d353;
            font-weight: 700;
            font-size: 1.4em;
        }
        .tuning-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .tuning-item {
            background: #21262d;
            border-radius: 8px;
            padding: 8px 10px;
            text-align: center;
            font-size: 0.9em;
        }
        .active {
            color: #39d353;
        }
        .inactive {
            color: #8b949e;
        }
        .back-link {
            color: #58a6ff;
            text-decoration: none;
            margin-top: 20px;
            display: inline-block;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
<div class="container">
    <a href="/autok/" class="back-link">⬅ Vissza a listához</a>

    <div class="card">
        <img src="/autok/uploads/<?= htmlspecialchars($car['main_image']) ?>" class="car-img" alt="Autó képe"
             onerror="this.src='/autok/no-image.png';">
        <h2><?= htmlspecialchars($car['car_name']) ?></h2>
        <p class="price"><?= $car['price'] > 0 ? number_format($car['price'], 0, ',', ' ') . ' Ft' : 'Nincs megadott ár' ?></p>

        <div class="mt-3">
            <?php if ($car['tuning_points']): ?>
                <p><strong>Tuning pontok:</strong> <?= $car['tuning_points'] ?></p>
            <?php endif; ?>

            <div class="tuning-grid">
                <?php if ($car['motor_level']): ?>
                    <div class="tuning-item">⚙️ Motor szint: <strong><?= $car['motor_level'] ?></strong></div>
                <?php endif; ?>
                <?php if ($car['transmission_level']): ?>
                    <div class="tuning-item">🔧 Váltó szint: <strong><?= $car['transmission_level'] ?></strong></div>
                <?php endif; ?>
                <?php if ($car['wheel_level']): ?>
                    <div class="tuning-item">🛞 Kerék szint: <strong><?= $car['wheel_level'] ?></strong></div>
                <?php endif; ?>
                <?php if ($car['chip_level']): ?>
                    <div class="tuning-item">💻 Chip szint: <strong><?= $car['chip_level'] ?></strong></div>
                <?php endif; ?>
            </div>

            <h4 class="mt-4">Extrák</h4>
            <div class="tuning-grid">
                <div class="tuning-item <?= $car['nitro'] ? 'active' : 'inactive' ?>">💥 Nitro <?= $car['nitro'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['turbo'] ? 'active' : 'inactive' ?>">🌀 Turbo <?= $car['turbo'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['compressor'] ? 'active' : 'inactive' ?>">⚡ Kompresszor <?= $car['compressor'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['air_ride'] ? 'active' : 'inactive' ?>">🪂 AirRide <?= $car['air_ride'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['dark_glass'] ? 'active' : 'inactive' ?>">🕶️ Sötétített üveg <?= $car['dark_glass'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['neon'] ? 'active' : 'inactive' ?>">🌈 Neon <?= $car['neon'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['colored_lights'] ? 'active' : 'inactive' ?>">💡 Színezett lámpa <?= $car['colored_lights'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['drivetype'] ? 'active' : 'inactive' ?>">🚗 Hajtástípus <?= $car['drivetype'] ? 'Van' : 'Nincs' ?></div>
                <div class="tuning-item <?= $car['despawn_protect'] ? 'active' : 'inactive' ?>">🛡️ Despawn védelem <?= $car['despawn_protect'] ? 'Van' : 'Nincs' ?></div>
            </div>
        </div>
    </div>
</div>
</body>
</html>
