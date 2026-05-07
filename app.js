const navToggle = document.getElementById("nav-toggle");
const navClose = document.getElementById("nav-close");
const navOverlay = document.getElementById("nav-overlay");
const sideNav = document.getElementById("side-nav");
const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));

const newsGrid = document.getElementById("news-grid");
const carsGrid = document.getElementById("cars-grid");
const carsEmpty = document.getElementById("cars-empty");
const carCount = document.getElementById("car-count");
const heroCarCount = document.getElementById("hero-car-count");
const carSearch = document.getElementById("car-search");
const membersGroups = document.getElementById("members-groups");
const footerAddress = document.getElementById("footer-address");
const footerPhoneList = document.getElementById("footer-phone-list");
const footerDiscordLink = document.getElementById("footer-discord-link");
const discordInviteLink = document.getElementById("discord-invite-link");
const applicationDiscordLink = document.getElementById("application-discord-link");
const applicationLinkText = document.getElementById("application-link-text");
const discordLinkText = document.getElementById("discord-link-text");
const discordHint = document.getElementById("discord-hint");
const discordServerName = document.getElementById("discord-server-name");

const webConfig = window.WEB_CONFIG ?? {};
const listingsUrl = "./data/auto-listings.json";
const teamMembersUrl = "./data/team-members.json";
let allCars = [];
let dynamicTeamRanks = [];

function setNavOpen(isOpen) {
  if (!sideNav || !navToggle || !navOverlay) {
    return;
  }

  sideNav.classList.toggle("is-open", isOpen);
  sideNav.setAttribute("aria-hidden", String(!isOpen));
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navOverlay.hidden = !isOpen;
}

function markCurrentNav() {
  const currentPage = document.body.dataset.page;
  navLinks.forEach((link) => {
    const matches = link.dataset.navLink === currentPage;
    link.classList.toggle("is-current", matches);
    if (matches) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setLinkState(element, href) {
  if (!element) {
    return;
  }

  const value = String(href ?? "").trim();
  if (!value) {
    element.classList.add("is-disabled");
    element.setAttribute("aria-disabled", "true");
    element.removeAttribute("href");
    return;
  }

  element.classList.remove("is-disabled");
  element.removeAttribute("aria-disabled");
  element.href = value;
}

function sanitizeDisplayName(name) {
  const raw = String(name ?? "").trim();
  if (!raw) {
    return "Ismeretlen";
  }

  const parts = raw.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : raw;
}

function renderFooter() {
  if (footerAddress) {
    footerAddress.textContent = String(webConfig.address ?? "Lossantos 6848");
  }

  if (footerPhoneList) {
    footerPhoneList.innerHTML = "";
    const phoneNumbers = Array.isArray(webConfig.phoneNumbers) ? webConfig.phoneNumbers : [];

    if (!phoneNumbers.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "footer-card__value";
      placeholder.textContent = "A telefonsz\u00e1mok hamarosan friss\u00fclnek.";
      footerPhoneList.appendChild(placeholder);
    } else {
      phoneNumbers.forEach((phoneNumber) => {
        const plainPhoneNumber = String(phoneNumber).replace(/[^\d+]/g, "");
        const link = document.createElement("a");
        link.className = "footer-phone";
        link.href = `tel:${plainPhoneNumber}`;
        link.textContent = phoneNumber;
        footerPhoneList.appendChild(link);
      });
    }
  }

  setLinkState(footerDiscordLink, webConfig.discordInviteUrl);
}

function renderNews() {
  if (!newsGrid) {
    return;
  }

  newsGrid.innerHTML = "";
  const newsItems = Array.isArray(webConfig.newsItems) ? webConfig.newsItems : [];

  newsItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "news-card";

    const kicker = document.createElement("div");
    kicker.className = "news-card__kicker";
    kicker.textContent = item.kicker || "";

    const title = document.createElement("h3");
    title.className = "news-card__title";
    title.textContent = item.title || "";

    const description = document.createElement("p");
    description.textContent = item.description || "";

    card.append(kicker, title, description);

    if (item.image) {
      const image = document.createElement("img");
      image.className = "news-card__image";
      image.src = item.image;
      image.alt = item.title || "H\u00edrk\u00e9p";
      image.loading = "lazy";
      image.addEventListener("click", () => openImageModal(item.image));
      card.appendChild(image);
    }

    newsGrid.appendChild(card);
  });
}

function createCarCard(car) {
  const card = document.createElement("article");
  card.className = "car-card";

  const media = document.createElement("div");
  media.className = "car-media";

  if (car.image_url) {
    const image = document.createElement("img");
    image.className = "car-image";
    image.src = car.image_url;
    image.alt = car.vehicle_type || "Felt\u00f6lt\u00f6tt aut\u00f3";
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "car-image-placeholder";
    placeholder.textContent = "Nincs k\u00e9p";
    media.appendChild(placeholder);
  }

  const tag = document.createElement("span");
  tag.className = "car-tag";
  tag.textContent = "Elad\u00f3";
  media.appendChild(tag);

  const content = document.createElement("div");
  content.className = "car-content";

  const title = document.createElement("h3");
  title.className = "car-type";
  title.textContent = car.vehicle_type || "Ismeretlen j\u00e1rm\u0171";

  const label = document.createElement("span");
  label.className = "car-price-label";
  label.textContent = "Meghirdetett \u00e1r";

  const price = document.createElement("strong");
  price.className = "car-price";
  price.textContent = car.advertised_price || "-";

  content.append(title, label, price);
  card.append(media, content);

  return card;
}

function renderCars(cars) {
  if (carCount) {
    carCount.textContent = String(cars.length);
  }

  if (heroCarCount) {
    heroCarCount.textContent = String(cars.length);
  }

  if (!carsGrid || !carsEmpty) {
    return;
  }

  carsGrid.innerHTML = "";

  if (!cars.length) {
    carsEmpty.hidden = false;
    return;
  }

  carsEmpty.hidden = true;
  cars.forEach((car) => {
    carsGrid.appendChild(createCarCard(car));
  });
}

function filterCars() {
  const query = String(carSearch?.value ?? "").trim().toLowerCase();
  if (!query) {
    renderCars(allCars);
    return;
  }

  const filteredCars = allCars.filter((car) =>
    String(car.vehicle_type ?? "").toLowerCase().includes(query),
  );

  renderCars(filteredCars);
}

async function loadCars() {
  if (!carsGrid && !heroCarCount) {
    return;
  }

  try {
    const response = await fetch(`${listingsUrl}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    allCars = Array.isArray(payload.cars) ? payload.cars : [];
    filterCars();
  } catch (error) {
    console.error("Nem siker\u00fclt bet\u00f6lteni az aut\u00f3list\u00e1t.", error);
    allCars = [];
    renderCars([]);
  }
}

function renderMembers() {
  if (!membersGroups) {
    return;
  }

  membersGroups.innerHTML = "";

  if (dynamicTeamRanks.length) {
    dynamicTeamRanks.forEach((rankGroup) => {
      const section = document.createElement("section");
      section.className = "rank-group";

      const head = document.createElement("div");
      head.className = "rank-group__head";

      const titleBlock = document.createElement("div");

      const eyebrow = document.createElement("div");
      eyebrow.className = "rank-group__eyebrow";
      eyebrow.textContent = "Rang";

      const title = document.createElement("h2");
      title.className = "rank-group__title";
      title.textContent = rankGroup.name;

      titleBlock.append(eyebrow, title);

      const count = document.createElement("div");
      count.className = "rank-group__count";
      count.textContent = `${rankGroup.members.length} tag`;

      head.append(titleBlock, count);

      const grid = document.createElement("div");
      grid.className = "members-grid";

      rankGroup.members.forEach((member) => {
        const card = document.createElement("article");
        card.className = "member-card";

        const badge = document.createElement("div");
        badge.className = "member-card__rank";
        badge.textContent = rankGroup.name;

        const name = document.createElement("h3");
        name.className = "member-card__name";
        name.textContent = sanitizeDisplayName(member.name);

        const meta = document.createElement("p");
        meta.className = "member-card__meta";

        card.append(badge, name, meta);
        grid.appendChild(card);
      });

      section.append(head, grid);
      membersGroups.appendChild(section);
    });

    return;
  }

  const members = Array.isArray(webConfig.teamMembers) ? webConfig.teamMembers : [];
  const rankOrder = Array.isArray(webConfig.rankOrder) ? webConfig.rankOrder : [];

  if (!members.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<h3>M\u00e9g nincs felt\u00f6lt\u00f6tt csapatlista</h3><p>A tagok list\u00e1ja hamarosan meg\u00e9rkezik.</p>";
    membersGroups.appendChild(empty);
    return;
  }

  const grouped = new Map();

  members.forEach((member) => {
    const rank = String(member.rank ?? "Egy\u00e9b").trim() || "Egy\u00e9b";
    if (!grouped.has(rank)) {
      grouped.set(rank, []);
    }

    grouped.get(rank).push({
      ...member,
      cleanName: sanitizeDisplayName(member.name),
    });
  });

  const knownRanks = rankOrder.filter((rank) => grouped.has(rank));
  const unknownRanks = Array.from(grouped.keys())
    .filter((rank) => !rankOrder.includes(rank))
    .sort((left, right) => left.localeCompare(right, "hu"));

  const sortedRanks = [...knownRanks, ...unknownRanks];

  sortedRanks.forEach((rank) => {
    const section = document.createElement("section");
    section.className = "rank-group";

    const head = document.createElement("div");
    head.className = "rank-group__head";

    const titleBlock = document.createElement("div");

    const eyebrow = document.createElement("div");
    eyebrow.className = "rank-group__eyebrow";
    eyebrow.textContent = "Rang";

    const title = document.createElement("h2");
    title.className = "rank-group__title";
    title.textContent = rank;

    titleBlock.append(eyebrow, title);

    const count = document.createElement("div");
    count.className = "rank-group__count";

    const items = grouped.get(rank) ?? [];
    count.textContent = `${items.length} tag`;

    head.append(titleBlock, count);

    const grid = document.createElement("div");
    grid.className = "members-grid";

    items.forEach((member) => {
      const card = document.createElement("article");
      card.className = "member-card";

      const badge = document.createElement("div");
      badge.className = "member-card__rank";
      badge.textContent = member.rank || rank;

      const name = document.createElement("h3");
      name.className = "member-card__name";
      name.textContent = member.cleanName;

      const meta = document.createElement("p");
      meta.className = "member-card__meta";
      meta.textContent = member.description || "A keresked\u00e9s kiemelt tagja.";

      card.append(badge, name, meta);
      grid.appendChild(card);
    });

    section.append(head, grid);
    membersGroups.appendChild(section);
  });
}

async function loadDynamicTeamMembers() {
  if (!membersGroups) {
    return;
  }

  try {
    const response = await fetch(`${teamMembersUrl}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const ranks = Array.isArray(payload.ranks) ? payload.ranks : [];
    dynamicTeamRanks = ranks
      .map((rankGroup) => ({
        name: String(rankGroup.name ?? "").trim(),
        members: Array.isArray(rankGroup.members) ? rankGroup.members : [],
      }))
      .filter((rankGroup) => rankGroup.name && rankGroup.members.length > 0);
  } catch (error) {
    console.warn("Nem siker\u00fclt bet\u00f6lteni a Discordb\u00f3l gener\u00e1lt csapatlist\u00e1t, marad a k\u00e9zi lista.", error);
    dynamicTeamRanks = [];
  }

  renderMembers();
}

function setupDiscordLinks() {
  const inviteUrl = String(webConfig.discordInviteUrl ?? "").trim();
  const applicationUrl = String(webConfig.applicationDiscordUrl ?? inviteUrl).trim();
  const serverName = String(webConfig.discordServerName ?? webConfig.dealershipName ?? "Mazanec & Jim\u00e9nez Motors Inc").trim();

  if (discordServerName) {
    discordServerName.textContent = serverName || "Mazanec & Jim\u00e9nez Motors Inc";
  }

  setLinkState(discordInviteLink, inviteUrl);
  setLinkState(applicationDiscordLink, applicationUrl);

  if (applicationLinkText) {
    applicationLinkText.textContent = applicationUrl || "https://discord.gg/Wnz9KWz8D2";
    if (applicationUrl) {
      applicationLinkText.href = applicationUrl;
    }
  }

  if (discordLinkText) {
    discordLinkText.textContent = inviteUrl || "https://discord.gg/Wnz9KWz8D2";
    if (inviteUrl) {
      discordLinkText.href = inviteUrl;
    }
  }

  if (discordHint) {
    discordHint.textContent = inviteUrl
      ? "A bel\u00e9p\u00e9s egy kattint\u00e1ssal el\u00e9rhet\u0151, a csatlakoz\u00e1si link k\u00f6zvetlen\u00fcl megnyitja a Discord szervert."
      : "\u00c1ll\u00edtsd be a Discord linket a web/site-config.js f\u00e1jlban.";
  }
}

navToggle?.addEventListener("click", () => setNavOpen(true));
navClose?.addEventListener("click", () => setNavOpen(false));
navOverlay?.addEventListener("click", () => setNavOpen(false));

navLinks.forEach((link) => {
  link.addEventListener("click", () => setNavOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setNavOpen(false);
  }
});

function openImageModal(src) {
  let modal = document.getElementById("image-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "image-modal";
    modal.className = "image-modal";

    modal.innerHTML = `
      <span class="image-modal__close">&times;</span>
      <img class="image-modal__content">
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", () => {
      modal.classList.remove("is-open");
    });
  }

  const image = modal.querySelector(".image-modal__content");
  image.src = src;

  modal.classList.add("is-open");
}

carSearch?.addEventListener("input", filterCars);

setNavOpen(false);
markCurrentNav();
renderFooter();
renderNews();
renderMembers();
setupDiscordLinks();
loadCars();
loadDynamicTeamMembers();
