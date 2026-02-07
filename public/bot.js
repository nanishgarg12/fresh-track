/* Pantry data shared via LocalStorage */
const pantry = JSON.parse(localStorage.getItem("pantryDB")) || [];

/* Emergency medicine knowledge */
const emergencyMedicines = [
    "paracetamol",
    "ors",
    "antiseptic",
    "bandage",
    "thermometer",
    "cough syrup",
    "antihistamine"
];

function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.toLowerCase();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    setTimeout(() => {
        addMessage(getBotReply(message), "bot");
    }, 500);
}

function addMessage(text, sender) {
    const chatBox = document.getElementById("chatBox");
    const div = document.createElement("div");
    div.className = sender;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* AI RESPONSE ENGINE */
function getBotReply(msg) {

    if (msg.includes("medicine") || msg.includes("emergency")) {
        return suggestMedicines();
    }

    if (msg.includes("shopping") || msg.includes("buy")) {
        return suggestShopping();
    }

    if (msg.includes("expired") || msg.includes("expiry")) {
        return checkExpiry();
    }

    if (msg.includes("low") || msg.includes("quantity")) {
        return checkLowStock();
    }

    return "I can help with medicines, shopping, expiry, and pantry advice 😊";
}

/* BOT SKILLS */

function suggestMedicines() {
    const available = pantry.map(p => p.name);
    const missing = emergencyMedicines.filter(m => !available.includes(m));

    if (missing.length === 0) {
        return "✅ You already have all essential emergency medicines.";
    }
    return "🏥 You should keep these medicines at home: " + missing.join(", ");
}

function suggestShopping() {
    if (pantry.length === 0) {
        return "🛒 Your pantry is empty. Consider buying daily essentials.";
    }
    return "🛒 Based on your pantry, check low or missing household items before shopping.";
}

function checkExpiry() {
    const today = new Date();
    const risky = pantry.filter(p =>
        (new Date(p.expiryDate) - today) / 86400000 <= 7
    );

    if (risky.length === 0) {
        return "✅ No items are close to expiry.";
    }
    return "⚠ Use soon: " + risky.map(i => i.name).join(", ");
}

function checkLowStock() {
    const low = pantry.filter(p => p.quantity <= 1);
    if (low.length === 0) {
        return "✅ All items have sufficient quantity.";
    }
    return "⚠ Low stock items: " + low.map(i => i.name).join(", ");
}
