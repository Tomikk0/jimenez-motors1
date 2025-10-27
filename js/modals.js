// DEBUG: Ellenőrizzük, hogy a függvények elérhetőek-e
console.log('✅ modals.js betöltődött');

function openAddCarModal() {
  if (!currentUser) {
    showMessage('Előbb jelentkezz be!', 'warning');
    return;
  }

  const modal = document.getElementById('addCarModal');
  if (!modal) return;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  setTimeout(() => {
    const modelInput = document.getElementById('modelSearch');
    if (modelInput) {
      modelInput.focus();
    }
  }, 200);
}

function closeAddCarModal(options = {}) {
  const modal = document.getElementById('addCarModal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  const modelDropdown = document.getElementById('modelDropdown');
  if (modelDropdown) {
    modelDropdown.style.display = 'none';
  }

  const preserveForm = options?.preserveForm ?? false;

  if (!preserveForm) {
    if (typeof clearInputs === 'function') {
      clearInputs();
    }
    if (typeof clearImage === 'function') {
      clearImage();
    }
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const modal = document.getElementById('addCarModal');
    if (modal && modal.classList.contains('open')) {
      closeAddCarModal();
    }
  }
});

// Eladás modal bezárása
function closeEditModal() {
  const modal = document.getElementById('editSaleModal');
  if (modal) {
    modal.style.display = 'none';
    modal.style.opacity = '';
    modal.style.visibility = '';
  }

  document.body.style.overflow = 'auto';
  currentCarIdForSale = null;
}

// Eladás modal megnyitása - JAVÍTOTT VERZIÓ
function openSoldModal(carId) {
  console.log('🚗 openSoldModal meghívva, carId:', carId);

  const normalizedCarId = normalizeCarId(carId);
  const car = allCars.find(c => normalizeCarId(c.id) === normalizedCarId);
  if (!car) {
    console.error('❌ Autó nem található:', carId);
    return;
  }

  currentCarIdForSale = normalizedCarId;
  
  // Modal elem lekérése
  const modal = document.getElementById('editSaleModal');
  if (!modal) {
    console.error('❌ editSaleModal elem nem található');
    return;
  }
  
  // Kép beállítása
  const carImage = document.getElementById('editCarImage');
  if (carImage) {
    const imageUrl = getImageUrl(car.image_url || car.image_data_url);
    if (imageUrl && !imageUrl.includes('undefined')) {
      carImage.src = imageUrl;
      carImage.style.display = 'block';
      console.log('✅ Kép beállítva:', imageUrl);
    } else {
      carImage.style.display = 'none';
      console.log('ℹ️ Nincs kép');
    }
  }
  
  // Autó adatok
  const modelElement = document.getElementById('editCarModel');
  const purchasePriceElement = document.getElementById('editPurchasePrice');
  const currentPriceElement = document.getElementById('editCurrentPrice');
  
  if (modelElement) modelElement.textContent = car.Model || 'Ismeretlen modell';
  if (purchasePriceElement) purchasePriceElement.textContent = car.VetelArFormatted ? car.VetelArFormatted + ' $' : 'Nincs megadva';
  if (currentPriceElement) currentPriceElement.textContent = car.EladasiArFormatted ? car.EladasiArFormatted + ' $' : 'Nincs megadva';
  
  // Eladási ár input
  const salePriceInput = document.getElementById('editSalePrice');
  if (salePriceInput) {
    salePriceInput.value = car.EladasiArFormatted || '';
  }
  
  // Eladás típus alaphelyzetbe állítása
  const kpRadio = document.getElementById('saleTypeKp');
  const normalRadio = document.getElementById('saleTypeNormal');
  if (kpRadio) kpRadio.checked = true;
  if (normalRadio) normalRadio.checked = false;
  
  // Profit számoló frissítése
  updateProfitCalculator();
  
  // Modal megjelenítése - MÓDOSÍTOTT
  modal.style.display = 'flex';
  modal.style.opacity = '1';
  modal.style.visibility = 'visible';
  
  console.log('✅ Modal megjelenítve');
  
  // Input fókusz
  setTimeout(() => {
    if (salePriceInput) {
      salePriceInput.focus();
      console.log('✅ Input fókusz beállítva');
    }
  }, 300);
}

// Profit számoló frissítése - MÓDOSÍTOTT
function updateProfitCalculator() {
  const salePriceField = document.getElementById('editSalePrice');
  if (!salePriceField) {
    return;
  }

  const salePriceInput = salePriceField.value.replace(/[^\d]/g, '');
  const salePrice = salePriceInput ? parseInt(salePriceInput, 10) : 0;
  const saleTypeElement = document.querySelector('input[name="saleType"]:checked');
  const saleType = saleTypeElement ? saleTypeElement.value : 'kp';

  const car = allCars.find(c => normalizeCarId(c.id) === normalizeCarId(currentCarIdForSale));
  const purchasePrice = car?.VetelAr || 0;

  const profitCalc = document.getElementById('profitCalc');

  if (salePrice > 0 && purchasePrice > 0) {
    // Adó számítás: normál eladás esetén 7.5% adó
    const taxRate = saleType === 'normal' ? 0.075 : 0;
    const taxAmount = Math.round(salePrice * taxRate);
    const netSalePrice = salePrice - taxAmount;
    const profit = netSalePrice - purchasePrice;
    
    const profitFormatted = new Intl.NumberFormat('hu-HU').format(Math.abs(profit));
    const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
    
    const calcPurchase = document.getElementById('calcPurchase');
    const calcSale = document.getElementById('calcSale');
    const calcTax = document.getElementById('calcTax');
    const taxLabel = document.getElementById('taxLabel');
    const calcNetSale = document.getElementById('calcNetSale');
    const netSaleLabel = document.getElementById('netSaleLabel');
    const calcProfit = document.getElementById('calcProfit');

    if (calcPurchase) {
      calcPurchase.textContent = new Intl.NumberFormat('hu-HU').format(purchasePrice) + ' $';
    }
    if (calcSale) {
      calcSale.textContent = new Intl.NumberFormat('hu-HU').format(salePrice) + ' $';
    }

    // Adó megjelenítése, ha van
    if (taxAmount > 0) {
      if (calcTax) {
        calcTax.textContent = new Intl.NumberFormat('hu-HU').format(taxAmount) + ' $';
        calcTax.style.display = 'block';
      }
      if (taxLabel) taxLabel.style.display = 'block';
      if (calcNetSale) {
        calcNetSale.textContent = new Intl.NumberFormat('hu-HU').format(netSalePrice) + ' $';
        calcNetSale.style.display = 'block';
      }
      if (netSaleLabel) netSaleLabel.style.display = 'block';
    } else {
      if (calcTax) calcTax.style.display = 'none';
      if (taxLabel) taxLabel.style.display = 'none';
      if (calcNetSale) calcNetSale.style.display = 'none';
      if (netSaleLabel) netSaleLabel.style.display = 'none';
    }

    if (calcProfit) {
      calcProfit.textContent = (profit >= 0 ? '+' : '-') + profitFormatted + ' $';
      calcProfit.className = profitClass;
    }

    if (profitCalc) {
      profitCalc.style.display = 'block';
    }
  } else {
    if (profitCalc) {
      profitCalc.style.display = 'none';
    }
  }
}

// Eladás megerősítése és mentése az adatbázisba
async function confirmSaleWithEdit() {
  let confirmButton = null;
  let originalButtonText = '';
  try {
    if (!currentUser) {
      showMessage('Bejelentkezés szükséges az eladáshoz!', 'warning');
      return;
    }

    if (!currentCarIdForSale) {
      showMessage('Nincs kiválasztott autó az eladáshoz!', 'error');
      return;
    }

    const salePriceInput = document.getElementById('editSalePrice');
    if (!salePriceInput) {
      showMessage('Hiányzik az eladási ár mező!', 'error');
      return;
    }

    const salePriceValue = salePriceInput.value.replace(/[^\d]/g, '');
    if (!salePriceValue) {
      showMessage('Adj meg egy érvényes eladási árat!', 'warning');
      salePriceInput.focus();
      return;
    }

    const salePrice = parseInt(salePriceValue, 10);
    if (!salePrice || isNaN(salePrice) || salePrice <= 0) {
      showMessage('Az eladási ár nem lehet 0!', 'warning');
      salePriceInput.focus();
      return;
    }

    const saleTypeElement = document.querySelector('input[name="saleType"]:checked');
    const saleType = saleTypeElement ? saleTypeElement.value : 'kp';

    const car = allCars.find(c => normalizeCarId(c.id) === normalizeCarId(currentCarIdForSale));
    if (!car) {
      showMessage('A kiválasztott autó nem található!', 'error');
      return;
    }

    const saleModal = document.getElementById('editSaleModal');
    confirmButton = saleModal ? saleModal.querySelector('.btn-confirm-sale') : null;
    if (confirmButton) {
      originalButtonText = confirmButton.textContent;
      confirmButton.disabled = true;
      confirmButton.textContent = '⏳ Mentés...';
    }

    const nowIso = new Date().toISOString();
    const updateData = {
      sold: true,
      sale_price: salePrice,
      sold_by: (currentUser && (currentUser.tagName || currentUser.username)) || null,
      sold_at: nowIso,
      updated_at: nowIso,
      tax_amount: null,
      net_sale_price: null
    };

    if (saleType === 'normal') {
      const taxRate = 0.075;
      const taxAmount = Math.round(salePrice * taxRate);
      updateData.tax_amount = taxAmount;
      updateData.net_sale_price = salePrice - taxAmount;
    }

    const { error } = await supabase
      .from('cars')
      .update(updateData)
      .eq('id', normalizeCarId(currentCarIdForSale));

    if (error) {
      console.error('confirmSaleWithEdit hiba:', error);
      showMessage('Hiba történt az autó eladásának mentésekor: ' + error.message, 'error');
      return;
    }

    showMessage('✅ Az autó sikeresen eladva!', 'success');

    closeEditModal();

    await loadCars();
    if (typeof loadStats === 'function') {
      loadStats();
    }
    if (typeof refreshSoldCars === 'function') {
      refreshSoldCars();
    } else if (typeof loadSoldCars === 'function') {
      loadSoldCars();
    }
  } catch (error) {
    console.error('confirmSaleWithEdit váratlan hiba:', error);
    showMessage('Váratlan hiba történt az eladás során', 'error');
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = originalButtonText || '✅ Autó eladva';
    }
  }
}

function openSaleModal(carId) {
  try {
    const car = allCars.find(c => normalizeCarId(c.id) === normalizeCarId(carId));
    if (!car) {
      console.error("❌ Autó nem található:", carId);
      return;
    }

    // Mentjük a jelenleg eladás alatt álló autó ID-ját
    window.currentCarIdForSale = normalizeCarId(carId);

    // Kitöltjük a modalt az adatokkal
    document.getElementById("editCarModel").textContent = car.Model || "Ismeretlen modell";
    document.getElementById("editPurchasePrice").textContent = new Intl.NumberFormat("hu-HU").format(car.VetelAr || 0) + " $";
    document.getElementById("editCurrentPrice").textContent = new Intl.NumberFormat("hu-HU").format(car.KivantAr || 0) + " $";
    document.getElementById("editCarImage").src = car.KepURL || "https://via.placeholder.com/200x100?text=No+Image";

    // Töröljük az előző ár értéket
    const saleInput = document.getElementById("editSalePrice");
    if (saleInput) saleInput.value = "";

    // Modal megjelenítése
    const modal = document.getElementById("editSaleModal");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Profit kalkulátor nullázása
    if (typeof updateProfitCalculator === "function") updateProfitCalculator();

    console.log(`🟢 Eladás modal megnyitva (${car.Model})`);
  } catch (err) {
    console.error("❌ openSaleModal hiba:", err);
  }
}

// A régi openSaleModal/closeEditModal funkciók más részekben is hivatkozhatók,
// ezért biztosítjuk, hogy a frissített verziók globálisan elérhetők legyenek.
window.openSoldModal = openSoldModal;
window.updateProfitCalculator = updateProfitCalculator;
window.confirmSaleWithEdit = confirmSaleWithEdit;
window.closeEditModal = closeEditModal;

document.addEventListener('DOMContentLoaded', function() {
  const saleModal = document.getElementById('editSaleModal');
  const confirmSaleButton = saleModal ? saleModal.querySelector('.btn-confirm-sale') : null;
  if (confirmSaleButton && !confirmSaleButton.getAttribute('onclick')) {
    confirmSaleButton.addEventListener('click', function(event) {
      event.preventDefault();
      confirmSaleWithEdit();
    });
  }
});

// === JELSZÓVÁLTOZTATÁS FUNKCIÓK ===

// Jelszóváltoztatás modal megnyitása
function openChangePasswordModal() {
    console.log('🔐 Jelszóváltoztatás modal megnyitása...');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        console.log('❌ Nincs bejelentkezve!');
        showMessage('Előbb jelentkezz be!', 'warning');
        return;
    }
    
    const modal = document.getElementById('changePasswordModal');
    console.log('Modal elem:', modal);
    
    if (!modal) {
        console.error('❌ changePasswordModal nem található!');
        showMessage('Hiba: a jelszóváltoztatás modal nem található', 'error');
        return;
    }
    
    modal.style.display = 'flex';
    console.log('✅ Modal megjelenítve');
    
    // Mezők ürítése
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Üzenet elrejtése
    const messageEl = document.getElementById('changePasswordMessage');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
    
    setTimeout(() => {
        document.getElementById('currentPassword').focus();
    }, 300);
}

// Jelszóváltoztatás modal bezárása
function closeChangePasswordModal() {
    console.log('🔐 Jelszóváltoztatás modal bezárása');
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function changePassword() {
    try {
        if (!currentUser) {
            showChangePasswordMessage('Nincs bejelentkezve!', 'error');
            return;
        }
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showChangePasswordMessage('Minden mező kitöltése kötelező!', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showChangePasswordMessage('Az új jelszavak nem egyeznek!', 'error');
            return;
        }
        
        if (newPassword.length < 4) {
            showChangePasswordMessage('Az új jelszó legalább 4 karakter hosszú legyen!', 'error');
            return;
        }
        
        // Jelenlegi jelszó ellenőrzése
        const { data: users, error: checkError } = await supabase
            .from('app_users')
            .select('*')
            .eq('username', currentUser.username);
        
        if (checkError || !users || users.length === 0) {
            showChangePasswordMessage('Hiba történt az ellenőrzés során!', 'error');
            return;
        }
        
        const user = users[0];
        
        // Base64 ellenőrzés
        if (user.password_hash !== btoa(currentPassword)) {
            showChangePasswordMessage('A jelenlegi jelszó nem megfelelő!', 'error');
            return;
        }
        
        // Új jelszó hash-elése (base64)
        const newPasswordHash = btoa(newPassword);
        
        // Jelszó frissítése
        const { error: updateError } = await supabase
            .from('app_users')
            .update({ 
                password_hash: newPasswordHash
            })
            .eq('username', currentUser.username);
        
        if (updateError) {
            console.error('Jelszóváltoztatás hiba:', updateError);
            showChangePasswordMessage('Hiba történt a jelszó megváltoztatása során: ' + updateError.message, 'error');
        } else {
            showChangePasswordMessage('✅ Jelszó sikeresen megváltoztatva!', 'success');
            
            setTimeout(() => {
                closeChangePasswordModal();
                showMessage('Jelszó sikeresen megváltoztatva!', 'success');
            }, 2000);
        }
        
    } catch (error) {
        console.error('changePassword hiba:', error);
        showChangePasswordMessage('Váratlan hiba történt!', 'error');
    }
}

// Event listener-ek a modalokhoz
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Jelszóváltoztatás event listener-ek beállítása...');
    
    // Enter billentyű kezelése a jelszóváltoztatás modalban
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        console.log('✅ changePasswordModal elem megtalálva');
        const inputs = changePasswordModal.querySelectorAll('input[type="password"]');
        inputs.forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('Enter lenyomva a jelszóváltoztatásban');
                    changePassword();
                }
            });
        });
    } else {
        console.error('❌ changePasswordModal elem nem található!');
    }
    
    // Modal bezárás kattintásra
    document.addEventListener('click', function(event) {
        const editModal = document.getElementById('editSaleModal');
        if (event.target === editModal) {
            closeEditModal();
        }
        
        const changePasswordModal = document.getElementById('changePasswordModal');
        if (event.target === changePasswordModal) {
            console.log('📌 Modal bezárása kattintásra');
            closeChangePasswordModal();
        }
        
        const badgeModal = document.getElementById('badgeModal');
        if (event.target === badgeModal) {
            closeBadgeModal();
        }
        
        const kickedMembersModal = document.getElementById('kickedMembersModal');
        if (event.target === kickedMembersModal) {
            closeKickedMembersModal();
        }
    });
});

// Profit számoló input esemény
document.addEventListener('DOMContentLoaded', function() {
  const salePriceInput = document.getElementById('editSalePrice');
  if (salePriceInput) {
    salePriceInput.addEventListener('input', function() {
      formatInputPrice(this);
      updateProfitCalculator();
    });
  }
});

// ... meglévő kód ...

// Galéria ár módosítás modal event listener
document.addEventListener('click', function(event) {
    // ... meglévő kód ...
    
    const editGalleryPriceModal = document.getElementById('editGalleryPriceModal');
    if (event.target === editGalleryPriceModal) {
        closeEditGalleryPriceModal();
    }
});

// Galéria ár input formázása
document.addEventListener('DOMContentLoaded', function() {
  const galleryPriceInput = document.getElementById('editGalleryPrice');
  if (galleryPriceInput) {
    galleryPriceInput.addEventListener('input', function() {
      formatInputPrice(this);
    });
  }
});
// Event listener-ek a modalokhoz
document.addEventListener('click', function(event) {
    // ... meglévő kód ...
    
    const editTuningModal = document.getElementById('editTuningModal');
    if (event.target === editTuningModal) {
        closeEditTuningModal();
    }
});

// Tuning ár input formázása
document.addEventListener('DOMContentLoaded', function() {
  const tuningPPInput = document.getElementById('editTuningPPPrice');
  const tuningPriceInput = document.getElementById('editTuningPrice');
  
  if (tuningPPInput) {
    tuningPPInput.addEventListener('input', function() {
      formatInputPrice(this);
    });
  }
  
  if (tuningPriceInput) {
    tuningPriceInput.addEventListener('input', function() {
      formatInputPrice(this);
    });
  }
});

// Ár módosítás modal megnyitása
function openEditGalleryPriceModal(carId, currentBasePrice, currentSalePrice) {
  if (!currentUser) {
    showGalleryMessage('Bejelentkezés szükséges!', 'warning');
    return;
  }

  // Aktuális autó adatainak betöltése
  const car = allCars.find(c => normalizeCarId(c.id) === normalizeCarId(carId)) || {};
  
  // Modal tartalom feltöltése
  document.getElementById('editGalleryCarId').value = carId;
  document.getElementById('editGalleryCarModel').textContent = car.model || 'Ismeretlen modell';
  
  // Árak formázása
  const formattedBasePrice = currentBasePrice ? new Intl.NumberFormat('hu-HU').format(currentBasePrice) : '';
  const formattedSalePrice = currentSalePrice ? new Intl.NumberFormat('hu-HU').format(currentSalePrice) : '';
  
  document.getElementById('editGalleryBasePrice').value = formattedBasePrice;
  document.getElementById('editGalleryPrice').value = formattedSalePrice;
  
  // Modal megjelenítése
  document.getElementById('editGalleryPriceModal').style.display = 'block';
  
  // Input fókusz
  setTimeout(() => {
    document.getElementById('editGalleryBasePrice').focus();
  }, 300);
}

// Ár módosítás mentése
async function saveGalleryPrice() {
  try {
    const carId = document.getElementById('editGalleryCarId').value;
    const newBasePrice = document.getElementById('editGalleryBasePrice').value.replace(/[^\d]/g, '');
    const newSalePrice = document.getElementById('editGalleryPrice').value.replace(/[^\d]/g, '');
    
    if (!carId) {
      showGalleryMessage('Autó azonosító hiányzik!', 'error');
      return;
    }
    
    if (!newSalePrice) {
      showGalleryMessage('Add meg az eladási árat!', 'warning');
      return;
    }
    
    const salePriceValue = parseInt(newSalePrice);
    if (isNaN(salePriceValue) || salePriceValue <= 0) {
      showGalleryMessage('Érvényes eladási árat adj meg!', 'error');
      return;
    }

    // Ellenőrizzük, hogy a felhasználónak joga van módosítani
    const normalizedCarId = normalizeCarId(carId);

    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', normalizedCarId)
      .single();

    if (carError || !car) {
      showGalleryMessage('Autó nem található!', 'error');
      return;
    }

    if (car.added_by !== currentUser.tagName && currentUser.role !== 'admin') {
      showGalleryMessage('Csak a saját autódat módosíthatod!', 'error');
      return;
    }

    // Árak frissítése
    const updateData = {
      sale_price: salePriceValue,
      updated_at: new Date().toISOString()
    };

    // Csak akkor adjuk hozzá az alap árat, ha meg van adva
    if (newBasePrice) {
      updateData.base_price = parseInt(newBasePrice);
    } else {
      updateData.base_price = null;
    }

    const { error } = await supabase
      .from('cars')
      .update(updateData)
      .eq('id', normalizedCarId);

    if (error) {
      showGalleryMessage('Hiba történt az ár módosítása során: ' + error.message, 'error');
    } else {
      showGalleryMessage('✅ Árak sikeresen módosítva!', 'success');
      closeEditGalleryPriceModal();
      loadCarGallery(); // Frissítjük a táblázatot
    }
    
  } catch (error) {
    console.error('saveGalleryPrice hiba:', error);
    showGalleryMessage('Hiba történt az ár módosítása során', 'error');
  }
}
// Galéria űrlap törlése
function clearGalleryForm() {
  document.getElementById('galleryModelSearch').value = '';
  document.getElementById('galleryBasePrice').value = '';
  document.getElementById('galleryPrice').value = '';
  clearGalleryImage();
}