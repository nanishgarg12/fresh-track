let currentUserId = null;
let pantry = [];

console.log("✅ Frontend script loaded");

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
    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: newUsername.value,
            password: newPassword.value,
            role: role.value
        })
    });

    if (!res.ok) {
        registerMsg.innerText = await res.text();
        return;
    }

    const data = await res.json();
    registerMsg.innerText = data.message;
}

async function login() {
    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    });

    if (!res.ok) {
        loginError.innerText = await res.text();
        return;
    }

    const data = await res.json();
    currentUserId = data.userId;

    loginPage.style.display = "none";
    registerPage.style.display = "none";
    app.style.display = "block";

    loadItems();
}

/* ================= PANTRY ================= */

async function addItem() {
    await fetch("/api/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: currentUserId,
            name: itemName.value,
            category: category.value,
            batchNumber: batchNumber.value,
            quantity: Number(quantity.value),
            purchaseDate: purchaseDate.value,
            expiryDate: expiryDate.value
        })
    });

    addMsg.innerText = "Item added!";
    loadItems();
}

async function loadItems() {
    const res = await fetch(`/api/items/${currentUserId}`);
    pantry = await res.json();
    renderDashboard();
    renderInventory();
}

/* ================= INVENTORY ================= */

function renderInventory() {
    if (!inventoryTable) return;

    inventoryTable.innerHTML = "";

    pantry.forEach(item => {
        inventoryTable.innerHTML += `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.expiryDate}</td>
            <td>
                <button onclick="useItem('${item._id}')">Use 1</button>
            </td>
        </tr>`;
    });
}

async function useItem(id) {
    await fetch(`/api/item/use/${id}`, { method: "PUT" });
    loadItems();
}

/* ================= DASHBOARD ================= */

function renderDashboard() {
    totalItems.innerText = pantry.length;

    expiryTable.innerHTML = "";
    const now = new Date();

    pantry
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
        .forEach(item => {
            const daysLeft = Math.ceil(
                (new Date(item.expiryDate) - now) / 86400000
            );
            expiryTable.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${daysLeft}</td>
                <td>${daysLeft < 5 ? "⚠️" : "✔"}</td>
                <td><button onclick="alert('Use ${item.name} soon')">Tip</button></td>
            </tr>`;
        });

    quickTip.innerText = "Use oldest stock first (FIFO)";
}

/* ================= UI ================= */

function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.getElementById(id).style.display = "block";
}

function logout() {
    currentUserId = null;
    app.style.display = "none";
    showLogin();
}

function openBot() {
    window.open("bot.html", "_blank");
}
