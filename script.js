// --- CONFIGURAÇÕES DO SISTEMA E ESTADO GLOBAL ---
let transactions = JSON.parse(localStorage.getItem("pro_transactions")) || [];
let categories = JSON.parse(localStorage.getItem("pro_categories")) || ["Alimentação", "Transporte", "Lazer", "Salário", "Investimentos"];
let creditCards = JSON.parse(localStorage.getItem("pro_cards")) || [
    { id: "card_1", name: "Cartão Principal", limit: 5000.00 }
];

// --- INITIALIZER ---
document.addEventListener("DOMContentLoaded", () => {
    checkSession();
    renderCategories();
    renderCardsList();
    setupForms();
    setupMonthFilter();
    updateSystemEngine();
});

// --- ENGINE DE ROTAS SPA ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active-tab');
    
    const event = window.event;
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
}

function checkSession() {
    const isLogged = localStorage.getItem("pro_logged") === "true";
    if (isLogged) {
        const loginScreen = document.getElementById("loginScreen");
        const appContainer = document.getElementById("appContainer");
        if(loginScreen) loginScreen.style.display = "none";
        if(appContainer) appContainer.style.display = "flex";
    }
}

// --- MÁSCARA DE MOEDA E CONVERSÃO ---
function applyMoneyMask(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value === "") { e.target.value = ""; return; }
    value = (parseInt(value) / 100).toFixed(2);
    value = value.replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = "R$ " + value;
}

function parseMoneyValue(stringVal) {
    if(!stringVal) return 0;
    const cleanVal = stringVal.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(cleanVal);
    return isNaN(parsed) ? 0 : parsed;
}

// --- CONTROLE DE MÊS ---
function setupMonthFilter() {
    const monthInput = document.getElementById("globalMonth");
    if(!monthInput) return;
    
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    monthInput.value = currentMonth;

    const recDate = document.getElementById("recDate");
    const expDate = document.getElementById("expDate");
    
    if(recDate) recDate.value = today.toISOString().split('T')[0];
    if(expDate) expDate.value = today.toISOString().split('T')[0];

    monthInput.addEventListener("change", updateSystemEngine);
}

// --- SISTEMA DE FORMS E INPUTS ---
function setupForms() {
    document.querySelectorAll('.money-input').forEach(input => {
        input.addEventListener('input', applyMoneyMask);
    });

    const loginForm = document.getElementById("loginForm");
    if(loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const u = document.getElementById("username").value;
            const p = document.getElementById("password").value;
            if(u === "admin" && p === "1234") {
                localStorage.setItem("pro_logged", "true");
                location.reload();
            } else {
                document.getElementById("loginError").style.display = "block";
            }
        });
    }

    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem("pro_logged");
            location.reload();
        });
    }

    document.getElementById("formReceita")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const date = document.getElementById("recDate").value;
        const desc = document.getElementById("recDesc").value;
        const amount = parseMoneyValue(document.getElementById("recAmount").value);
        const category = document.getElementById("recCat").value;
        
        transactions.push({ id: Date.now(), type: 'entrada', date, desc, amount, category, method: 'dinheiro' });
        saveAndRefresh();
        document.getElementById("recDesc").value = "";
        document.getElementById("recAmount").value = "";
    });

    document.getElementById("formDespesa")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const date = document.getElementById("expDate").value;
        const desc = document.getElementById("expDesc").value;
        const amount = parseMoneyValue(document.getElementById("expAmount").value);
        const category = document.getElementById("expCat").value;
        const method = document.getElementById("expMethod").value;
        
        transactions.push({ id: Date.now(), type: 'saida', date, desc, amount, category, method });
        saveAndRefresh();
        document.getElementById("expDesc").value = "";
        document.getElementById("expAmount").value = "";
    });

    document.getElementById("formCategoria")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("newCatName").value.trim();
        if(name && !categories.includes(name)) {
            categories.push(name);
            localStorage.setItem("pro_categories", JSON.stringify(categories));
            renderCategories();
            document.getElementById("formCategoria").reset();
        }
    });

    document.getElementById("formCartao")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("newCardName").value.trim();
        const limit = parseMoneyValue(document.getElementById("newCardLimit").value);
        
        if(name && limit > 0) {
            const newCard = { id: "card_" + Date.now(), name, limit };
            creditCards.push(newCard);
            localStorage.setItem("pro_cards", JSON.stringify(creditCards));
            renderCardsList();
            saveAndRefresh();
            document.getElementById("newCardName").value = "";
            document.getElementById("newCardLimit").value = "";
        }
    });
}

function saveAndRefresh() {
    localStorage.setItem("pro_transactions", JSON.stringify(transactions));
    updateSystemEngine();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveAndRefresh();
}

function formatDateBR(dateString) {
    if(!dateString) return "--/--/----";
    const parts = dateString.split("-");
    if(parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// --- CORE ENGINE ATUALIZADO (SEM CONFLITOS VELHOS) ---
function updateSystemEngine() {
    let totalIn = 0; let totalOut = 0;
    
    let spentPerCard = {};
    creditCards.forEach(card => spentPerCard[card.id] = 0);

    const selectedMonth = document.getElementById("globalMonth")?.value || "";

    const tInBody = document.getElementById("tableReceitas");
    const tOutBody = document.getElementById("tableDespesas");
    const tRepBody = document.getElementById("tableRelatorio");

    if(tInBody) tInBody.innerHTML = "";
    if(tOutBody) tOutBody.innerHTML = "";
    if(tRepBody) tRepBody.innerHTML = "";

    const filteredTransactions = transactions.filter(t => t.date && t.date.startsWith(selectedMonth));

    filteredTransactions.forEach(t => {
        const dateBr = formatDateBR(t.date);
        const formattedAmount = (t.amount || 0).toFixed(2).replace('.', ',');
        
        if(t.type === 'entrada') {
            totalIn += t.amount;
            if(tInBody) tInBody.innerHTML += `<tr><td>${dateBr}</td><td>${t.desc}</td><td>${t.category}</td><td style="color:var(--green); font-weight:600">R$ ${formattedAmount}</td><td><button class="btn-del-action" onclick="deleteTransaction(${t.id})">❌</button></td></tr>`;
        } else {
            totalOut += t.amount;
            
            let paymentLabel = "💵 Dinheiro / Pix";
            if(t.method && t.method.startsWith("card_")) {
                const cardFound = creditCards.find(c => c.id === t.method);
                paymentLabel = cardFound ? `💳 ${cardFound.name}` : "💳 Cartão";
                if(spentPerCard[t.method] !== undefined) {
                    spentPerCard[t.method] += t.amount;
                }
            }
            
            if(tOutBody) tOutBody.innerHTML += `<tr><td>${dateBr}</td><td>${t.desc}</td><td>${t.category}</td><td>${paymentLabel}</td><td style="color:var(--red); font-weight:600">R$ ${formattedAmount}</td><td><button class="btn-del-action" onclick="deleteTransaction(${t.id})">❌</button></td></tr>`;
        }
        
        let repTypeLabel = t.type === 'entrada' ? '🟢 Entrada' : '🔴 Saída';
        if(tRepBody) tRepBody.innerHTML += `<tr><td>${dateBr}</td><td>${repTypeLabel}</td><td>${t.desc}</td><td>${t.category}</td><td style="font-weight:600; color: ${t.type === 'entrada' ? 'var(--green)' : 'var(--red)'}">R$ ${formattedAmount}</td></tr>`;
    });

    const balance = totalIn - totalOut;
    if(document.getElementById("dashIn")) document.getElementById("dashIn").innerText = `R$ ${totalIn.toFixed(2).replace('.', ',')}`;
    if(document.getElementById("dashOut")) document.getElementById("dashOut").innerText = `R$ ${totalOut.toFixed(2).replace('.', ',')}`;
    if(document.getElementById("dashBalance")) document.getElementById("dashBalance").innerText = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    
    const balanceCard = document.getElementById("dashBalanceCard");
    if(balanceCard) {
        balanceCard.style.backgroundColor = balance >= 0 ? "#ecfdf5" : "#fef2f2";
        document.getElementById("dashBalance").style.color = balance >= 0 ? "var(--green)" : "var(--red)";
    }

    renderCardsDashboard(spentPerCard);
    processSavingTips(balance, spentPerCard, totalOut, filteredTransactions.length);
}

function renderCardsDashboard(spentPerCard) {
    const container = document.getElementById("cardsContainer");
    if(!container) return;
    container.innerHTML = "";

    if(creditCards.length === 0) {
        container.innerHTML = "<p style='color: var(--text-light); font-size:0.9rem;'>Nenhum cartão cadastrado.</p>";
        return;
    }

    creditCards.forEach(card => {
        const spent = spentPerCard[card.id] || 0;
        const available = card.limit - spent;
        const pct = Math.min((spent / card.limit) * 100, 100);

        container.innerHTML += `
            <div class="credit-card-info" style="margin-bottom: 20px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <h4 style="font-size:0.95rem; margin-bottom:5px; color: var(--sidebar-bg)">💳 ${card.name}</h4>
                <p style="margin-bottom:2px; font-size:0.85rem;">Fatura Atual: <strong style="color: var(--red);">R$ ${spent.toFixed(2).replace('.', ',')}</strong></p>
                <p style="margin-bottom:6px; font-size:0.85rem;">Limite Disponível: <strong style="color: var(--green);">R$ ${available.toFixed(2).replace('.', ',')}</strong> / R$ ${card.limit.toFixed(2).replace('.', ',')}</p>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${pct}%;"></div></div>
            </div>
        `;
    });
}

function renderCategories() {
    const list = document.getElementById("listCategorias");
    if(!list) return;
    list.innerHTML = "";
    
    const dropdowns = document.querySelectorAll(".cat-dropdown");
    const reportFilter = document.getElementById("reportFilterCat");
    
    dropdowns.forEach(d => d.innerHTML = "");
    if(reportFilter) reportFilter.innerHTML = '<option value="todas">Todas as Categorias</option>';

    categories.forEach(cat => {
        list.innerHTML += `<li>${cat}</li>`;
        dropdowns.forEach(d => d.innerHTML += `<option value="${cat}">${cat}</option>`);
        if(reportFilter) reportFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function renderCardsList() {
    const list = document.getElementById("listCartoes");
    if(list) {
        list.innerHTML = "";
        creditCards.forEach(card => {
            list.innerHTML += `<li><strong>${card.name}</strong> - Limite: R$ ${card.limit.toFixed(2).replace('.', ',')}</li>`;
        });
    }

    const methodDropdown = document.getElementById("expMethod");
    if(methodDropdown) {
        methodDropdown.innerHTML = '<option value="dinheiro">💵 Dinheiro / Pix</option>';
        creditCards.forEach(card => {
            methodDropdown.innerHTML += `<option value="${card.id}">💳 ${card.name}</option>`;
        });
    }
}

function applyReportFilter() {
    const filterSelect = document.getElementById("reportFilterCat");
    const monthInput = document.getElementById("globalMonth");
    const tRepBody = document.getElementById("tableRelatorio");
    
    if(!filterSelect || !monthInput || !tRepBody) return;
    
    const filterValue = filterSelect.value;
    const selectedMonth = monthInput.value;
    tRepBody.innerHTML = "";

    const filteredTransactions = transactions.filter(t => t.date && t.date.startsWith(selectedMonth));

    filteredTransactions.forEach(t => {
        if(filterValue === "todas" || t.category === filterValue) {
            const dateBr = formatDateBR(t.date);
            const formattedAmount = (t.amount || 0).toFixed(2).replace('.', ',');
            let repTypeLabel = t.type === 'entrada' ? '🟢 Entrada' : '🔴 Saída';
            tRepBody.innerHTML += `<tr><td>${dateBr}</td><td>${repTypeLabel}</td><td>${t.desc}</td><td>${t.category}</td><td style="font-weight:600; color: ${t.type === 'entrada' ? 'var(--green)' : 'var(--red)'}">R$ ${formattedAmount}</td></tr>`;
        }
    });
}

function exportToCSV() {
    const monthInput = document.getElementById("globalMonth");
    if(!monthInput) return;
    const selectedMonth = monthInput.value;
    
    const filteredTransactions = transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
    
    let csvContent = "data:text/csv;charset=utf-8,Data,Tipo,Descricao,Categoria,Valor\n";
    filteredTransactions.forEach(t => {
        csvContent += `${formatDateBR(t.date)},${t.type.toUpperCase()},${t.desc},${t.category},${(t.amount || 0).toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function processSavingTips(balance, spentPerCard, totalOut, transacoesNoMes) {
    const tipElement = document.getElementById("savingTipText");
    if(!tipElement) return;
    
    if (transacoesNoMes === 0) {
        tipElement.innerText = "Mês sem movimentações de fluxo de caixa. Insira seus dados para ativar o motor analítico.";
        return;
    }

    let cartaoCritico = null;
    for (let id in spentPerCard) {
        const card = creditCards.find(c => c.id === id);
        if(card && spentPerCard[id] > (card.limit * 0.75)) {
            cartaoCritico = card.name;
            break;
        }
    }

    if (balance < 0) {
        tipElement.innerText = "🚨 Alerta do Sistema: Detetámos um défice no seu saldo deste mês. O seu volume de saídas ultrapassou as receitas. Recomendamos suspender despesas variáveis não essenciais imediatamente.";
    } else if (cartaoCritico) {
        tipElement.innerText = `⚠️ Alerta de Crédito: O cartão [${cartaoCritico}] ultrapassou 75% do limite disponível. O motor sugere priorizar pagamentos em dinheiro ou Pix para mitigar riscos de juros no próximo ciclo.`;
    } else if (balance > 0 && balance < (totalOut * 0.15)) {
        tipElement.innerText = "📉 Margem de Segurança Estreita: A sua taxa de poupança está abaixo de 15% em relação aos custos fixos acumulados. Considere renegociar subscrições nesta quinzena.";
    } else {
        tipElement.innerText = "🌟 Saúde Financeira Estável: O algoritmo detetou um rácio ideal entre receitas e despesas. Sugerimos alocar pelo menos 10% deste saldo para investimentos.";
    }
}