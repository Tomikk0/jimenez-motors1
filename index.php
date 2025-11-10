<?php
// index.php - autók listázása
?>
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚗 Autólista - Jimenez.hu</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: #0d1117;
            color: #e6edf3;
            font-family: 'Segoe UI', sans-serif;
        }
        .car-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 16px;
            transition: all 0.3s ease;
        }
        .car-card:hover {
            transform: translateY(-4px);
            border-color: #58a6ff;
        }
        .car-img {
            width: 100%;
            height: 220px;
            object-fit: cover;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
        }
        .price {
            color: #39d353;
            font-weight: 600;
            font-size: 1.2em;
        }
        .header-title {
            color: #58a6ff;
            text-align: center;
            margin: 30px 0 20px;
        }
        .tuning {
            color: #8b949e;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
<div class="container">
    <h1 class="header-title">🚘 Jimenez Autók</h1>
    <div id="carContainer" class="row g-4"></div>
</div>

<script>
async function loadCars() {
    try {
        const response = await fetch("/autok/api.php");
        if (!response.ok) throw new Error("API hiba: " + response.status);
        const cars = await response.json();

        const container = document.getElementById("carContainer");
        container.innerHTML = "";

        if (cars.length === 0) {
            container.innerHTML = "<p class='text-center text-secondary'>Nincs elérhető autó az adatbázisban.</p>";
            return;
        }

        cars.forEach(car => {
            // mindig az első feltöltött kép legyen a fő
            const imageUrl = `/autok/uploads/${car.main_image}`;
            const carName = car.car_name ? car.car_name : "Ismeretlen modell";
            const price = car.price && car.price > 0 ? car.price.toLocaleString("hu-HU") + " Ft" : "Ár: nincs megadva";
            const tuning = car.tuning_points ? `Tuning pontok: ${car.tuning_points}` : "";

            const card = document.createElement("div");
            card.className = "col-md-4 col-lg-3";
            card.innerHTML = `
                <div class="car-card h-100 shadow-sm">
                    <img src="${imageUrl}" alt="${carName}" class="car-img" onerror="this.src='/autok/no-image.png';">
                    <div class="p-3">
                        <h5>${carName}</h5>
                        <p class="price">${price}</p>
                        ${tuning ? `<p class="tuning">${tuning}</p>` : ""}
                        <a href="/autok/car.php?id=${car.id}" class="btn btn-primary w-100 mt-2">Részletek</a>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("❌ Hiba:", err);
        document.getElementById("carContainer").innerHTML =
            `<p class='text-danger text-center'>Nem sikerült betölteni az autókat (${err.message}).</p>`;
    }
}

loadCars();
</script>
</body>
</html>
