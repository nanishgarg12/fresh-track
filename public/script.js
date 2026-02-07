let currentUserId = null;
let pantry = [];

console.log("✅ Frontend script loaded");

/* ================= AUTH ================= */

function showRegister() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("registerPage").style.display = "block";
}

function showLogin() {
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("loginPage").style.display = "block";
}

async function createUser() {
    const username = newUsername.value;
    const password = newPassword.value;
    const role = roleSelect.value || document.getElementById("role").value;

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    document.getElementById("registerMsg").innerText =
        data.message || data.error;
}

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.error) {
        document.getElementById("loginError").innerText = data.error;
        return;
    }

    currentUserId = data.userId;

    document.getElementById("loginPage").style.display = "none";
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("app").style.display = "block";

    showPage("dashboard");
    loadItems();
}

/* ================= PANTRY ================= */

async function addItem() {
    const item = {
        userId: currentUserId,
        name: itemName.value,
        category: category.value,
        batchNumber: batchNumber.value,
        quantity: Number(quantity.value),
        purchaseDate: purchaseDate.value,
        expiryDate: expiryDate.value
    };

    await fetch('/api/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });

    document.getElementById("addMsg").innerText = "Item added!";
    loadItems();
}

async function loadItems() {
    const res = await fetch(`/api/items/${currentUserId}`);
    pantry = await res.json();
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById("pantryTable");
    tbody.innerHTML = "";

    pantry.forEach(item => {
        tbody.innerHTML += `
        <tr>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.batchNumber}</td>
            <td>${new Date(item.purchaseDate).toDateString()}</td>
            <td>${new Date(item.expiryDate).toDateString()}</td>
            <td>${item.quantity - item.quantityUsed}</td>
            <td>
                <button onclick="deleteItem('${item._id}')">❌</button>
            </td>
        </tr>`;
    });
}

async function deleteItem(id) {
    await fetch(`/api/item/${id}`, { method: 'DELETE' });
    loadItems();
}

/* ================= UI ================= */

function showPage(id) {
    document.querySelectorAll(".page")
        .forEach(p => p.style.display = "none");
    document.getElementById(id).style.display = "block";
}

function logout() {
    currentUserId = null;
    document.getElementById("app").style.display = "none";
    showLogin();
}

function openBot() {
    window.open("bot.html", "_blank");
}
