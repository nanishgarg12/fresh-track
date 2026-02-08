/* ================= GLOBAL ================= */

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "";

let currentUserId = null;
let pantry = [];

console.log("✅ Frontend script loaded");

/* ================= DOM ================= */

const loginPage = document.getElementById("loginPage");
const registerPage = document.getElementById("registerPage");
const app = document.getElementById("app");

const username = document.getElementById("username");
const password = document.getElementById("password");
const loginError = document.getElementById("loginError");

const newUsername = document.getElementById("newUsername");
const newPassword = document.getElementById("newPassword");
const role = document.getElementById("role");
const registerMsg = document.getElementById("registerMsg");

const itemName = document.getElementById("itemName");
const category = document.getElementById("category");
const batchNumber = document.getElementById("batchNumber");
const quantity = document.getElementById("quantity");
const purchaseDate = document.getElementById("purchaseDate");
const expiryDate = document.getElementById("expiryDate");
const addMsg = document.getElementById("addMsg");

const inventoryTable = document.getElementById("inventoryTable");
const expiryTable = document.getElementById("expiryTable");
const totalItems = document.getElementById("totalItems");
const quickTip = document.getElementById("quickTip");

/* ================= AUTH ================= */

function showRegister() {
  loginPage.style.display = "none";
  registerPage.style.display = "block";
}

function showLogin() {
  registerPage.style.display = "none";
  loginPage.style.display = "block";
}

async function createUser() {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: newUsername.value,
      password: newPassword.value,
      role: role.value,
    }),
  });

  const data = await res.json();
  registerMsg.innerText = data.message || data.error;
}

async function login() {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    loginError.innerText = data.error;
    return;
  }

  currentUserId = data.userId;

  loginPage.style.display = "none";
  registerPage.style.display = "none";
  app.style.display = "block";

  loadItems();
}

/* ================= PANTRY ================= */

async function addItem() {
  await fetch(`${API_BASE}/api/item`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: currentUserId,
      name: itemName.value,
      category: category.value,
      batchNumber: batchNumber.value,
      quantity: Number(quantity.value),
      purchaseDate: purchaseDate.value,
      expiryDate: expiryDate.value,
    }),
  });

  addMsg.innerText = "Item added!";
  loadItems();
}

async function loadItems() {
  const res = await fetch(`${API_BASE}/api/items/${currentUserId}`);
  pantry = await res.json();
  renderDashboard();
  renderInventory();
}

/* ================= INVENTORY ================= */

function renderInventory() {
  inventoryTable.innerHTML = "";

  pantry.forEach((item) => {
    inventoryTable.innerHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${new Date(item.expiryDate).toLocaleDateString()}</td>
      </tr>
    `;
  });
}

/* ================= DASHBOARD ================= */

function renderDashboard() {
  totalItems.innerText = pantry.length;
  expiryTable.innerHTML = "";

  const now = new Date();

  pantry
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    .forEach((item) => {
      const daysLeft = Math.ceil(
        (new Date(item.expiryDate) - now) / 86400000
      );

      expiryTable.innerHTML += `
        <tr>
          <td>${item.name}</td>
          <td>${daysLeft}</td>
          <td>${daysLeft < 5 ? "⚠️" : "✔️"}</td>
        </tr>
      `;
    });

  quickTip.innerText = "Use oldest stock first (FIFO)";
}

/* ================= UI ================= */

function logout() {
  currentUserId = null;
  app.style.display = "none";
  showLogin();
}

function openBot() {
  window.open("bot.html", "_blank");
}
const shoppingListEl = document.getElementById("shoppingList");
const scanInput = document.getElementById("scanInput");

function scanItem() {
    const name = scanInput.value.trim();
    if (!name) return;

    const existing = pantry.find(
        i => i.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
        alert(`${name} already exists in pantry (Qty: ${existing.quantity})`);
    } else {
        const li = document.createElement("li");
        li.innerText = name;
        shoppingListEl.appendChild(li);
    }

    scanInput.value = "";
}
