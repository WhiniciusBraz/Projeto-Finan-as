document.addEventListener("DOMContentLoaded", () => {
    const page = window.location.pathname.split("/").pop();
    const isLogged = localStorage.getItem("isLogged") === "true";

    if (page === "dashboard.html" && !isLogged) {
        window.location.href = "index.html";
    }
    if ((page === "index.html" || page === "") && isLogged) {
        window.location.href = "dashboard.html";
    }

    if (page === "dashboard.html") { initDashboard(); } else { initLogin(); }
});

function initLogin() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const user = document.getElementById("username").value;
        const pass = document.getElementById("password").value;
        if (user === "admin" && pass === "1234") {
            localStorage.setItem("isLogged", "true");
            window.location.href = "dashboard.html";
        } else {
            document.getElementById("loginError").style.display = "block";
        }
    });
}

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function initDashboard() {
    document.getElementById("btnLogout").addEventListener("click", () => {
        localStorage.removeItem("isLogged");
        window.location.href = "index.html";
    });

    document.getElementById("transactionForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const desc = document.getElementById("desc").value;
        const amount = parseFloat(document.getElementById("amount").value);
        const type = document.getElementById("type").value;

        transactions.push({ id: Date.now(), desc, amount, type });
        localStorage.setItem("transactions", JSON.stringify(transactions));
        updateUI();
        document.getElementById("transactionForm").reset();
    });
    updateUI();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem("transactions", JSON.stringify(transactions));
    updateUI();
}

function updateUI() {
    const tableBody = document.getElementById("transactionTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    let totalIn = 0, totalOut = 0;

    transactions.forEach(t => {
        if (t.type === "entrada") totalIn += t.amount; else totalOut += t.amount;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${t.desc}</td>
            <td class="${t.type === 'entrada' ? 'td-entrada' : 'td-saida'}">R$ ${t.amount.toFixed(2)}</td>
            <td>${t.type.toUpperCase()}</td>
            <td><button class="btn-delete" onclick="deleteTransaction(${t.id})">Excluir</button></td>
        `;
        tableBody.appendChild(row);
    });

    const balance = totalIn - totalOut;
    document.getElementById("totalIn").innerText = `R$ ${totalIn.toFixed(2)}`;
    document.getElementById("totalOut").innerText = `R$ ${totalOut.toFixed(2)}`;
    document.getElementById("totalBalance").innerText = `R$ ${balance.toFixed(2)}`;
    
    const card = document.getElementById("cardBalance");
    if(balance >= 0) { card.style.backgroundColor = "#ecfdf5"; document.getElementById("totalBalance").style.color = "#10b981"; } 
    else { card.style.backgroundColor = "#fef2f2"; document.getElementById("totalBalance").style.color = "#ef4444"; }
}