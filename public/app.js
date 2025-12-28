const form = document.getElementById("analysis-form");
const result = document.getElementById("analysis-result");

function renderResult(data) {
  result.classList.remove("hidden");
  result.innerHTML = `
    <h3>Elemzés elkészült</h3>
    <p><strong>Eladó:</strong> ${data.seller}</p>
    <p><strong>Ár:</strong> ${data.price ? data.price.toLocaleString("hu-HU") + " Ft" : "Nincs megadva"}</p>
    <p><strong>Tuning elemek:</strong> ${data.tuning}</p>
  `;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  const files = formData.getAll("images");
  if (files.length > 3) {
    alert("Legfeljebb 3 kép tölthető fel.");
    return;
  }

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Ismeretlen hiba");
    }

    const data = await response.json();
    renderResult(data);
  } catch (error) {
    result.classList.remove("hidden");
    result.textContent = `Hiba: ${error.message}`;
  }
});
