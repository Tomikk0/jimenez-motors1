const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const vehicleSection = document.getElementById("vehicle-section");
const analysisSection = document.getElementById("analysis-section");
const vehicleForm = document.getElementById("vehicle-form");
const vehicleList = document.getElementById("vehicle-list");
const analysisList = document.getElementById("analysis-list");
const logoutButton = document.getElementById("logout");

let token = sessionStorage.getItem("adminToken");

function setLoggedIn(isLoggedIn) {
  vehicleSection.classList.toggle("hidden", !isLoggedIn);
  analysisSection.classList.toggle("hidden", !isLoggedIn);
  loginForm.classList.toggle("hidden", isLoggedIn);
  if (!isLoggedIn) {
    loginStatus.textContent = "";
  }
}

async function fetchVehicles() {
  const response = await fetch("/api/vehicles", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Nem sikerült lekérni a járműveket.");
  }
  return response.json();
}

async function fetchAnalyses() {
  const response = await fetch("/api/analyses", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Nem sikerült lekérni az elemzéseket.");
  }
  return response.json();
}

function renderVehicles(vehicles) {
  if (vehicles.length === 0) {
    vehicleList.innerHTML = "<p>Nincs még jármű felvéve.</p>";
    return;
  }
  vehicleList.innerHTML = vehicles
    .map(
      (vehicle) => `
        <div class="list-item">
          <strong>${vehicle.name}</strong>
          <span>${Number(vehicle.price).toLocaleString("hu-HU")} Ft</span>
        </div>
      `
    )
    .join("");
}

function renderAnalyses(analyses) {
  if (analyses.length === 0) {
    analysisList.innerHTML = "<p>Nincs még mentett elemzés.</p>";
    return;
  }
  analysisList.innerHTML = analyses
    .map(
      (analysis) => `
        <div class="list-item">
          <div>
            <strong>${analysis.seller}</strong>
            <p>${analysis.tuning}</p>
          </div>
          <div>
            <span>${analysis.price ? Number(analysis.price).toLocaleString("hu-HU") + " Ft" : "-"}</span>
            <small>${new Date(analysis.created_at).toLocaleString("hu-HU")}</small>
          </div>
        </div>
      `
    )
    .join("");
}

async function refreshData() {
  const [vehicles, analyses] = await Promise.all([fetchVehicles(), fetchAnalyses()]);
  renderVehicles(vehicles);
  renderAnalyses(analyses);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Hibás belépési adatok.");
    }

    const data = await response.json();
    token = data.token;
    sessionStorage.setItem("adminToken", token);
    loginStatus.textContent = "Sikeres belépés.";
    setLoggedIn(true);
    await refreshData();
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

vehicleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(vehicleForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Nem sikerült menteni.");
    }
    vehicleForm.reset();
    await refreshData();
  } catch (error) {
    alert(error.message);
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("adminToken");
  token = null;
  setLoggedIn(false);
});

if (token) {
  setLoggedIn(true);
  refreshData().catch(() => {
    setLoggedIn(false);
  });
} else {
  setLoggedIn(false);
}
