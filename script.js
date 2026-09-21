/* ================================================================
   MEU BOLSO - LÓGICA DO APLICATIVO
   Todos os dados são salvos no próprio navegador (localStorage).
   ================================================================ */

const STORAGE_KEY = "meuBolsoDadosV1";
const THEME_KEY = "meuBolsoTema";

/* CATEGORIAS INICIAIS: A PESSOA PODE EDITÁ-LAS NA ÁREA "MAIS". */
const defaultCategories = {
    combustivel: { name: "Combustível", icon: "⛽" },
    passagens: { name: "Passagens", icon: "🚌" },
    alimentacao_uf: { name: "Alimentação UF", icon: "🍽️" },
    mercado: { name: "Mercado", icon: "🛒" },
    casa: { name: "Casa", icon: "⌂" },
    saude: { name: "Saúde", icon: "✚" },
    lazer: { name: "Lazer", icon: "☀" },
    outros: { name: "Outros", icon: "•••" }
};

/* ESTADO ATUAL DO APLICATIVO: É CRIADO DEPOIS DAS CATEGORIAS PADRÃO. */
const state = {
    screen: "home",
    expenseView: "all",
    selectedMonth: new Date().toISOString().slice(0, 7),
    data: loadData()
};

/* ================================================================
   INICIALIZAÇÃO E DADOS PADRÃO
   ================================================================ */

function loadData() {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData) {
        return normalizeData(JSON.parse(savedData));
    }

    return {
        cards: [],
        expenses: [],
        incomes: [],
        categories: createDefaultCategories()
    };
}

// Garante que backups e dados antigos também recebam as novas categorias editáveis.
function normalizeData(data) {
    const savedCategories = data.categories && typeof data.categories === "object" ? data.categories : createDefaultCategories();

    if (!savedCategories.outros) {
        savedCategories.outros = { ...defaultCategories.outros };
    }

    return {
        cards: Array.isArray(data.cards) ? data.cards : [],
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        incomes: Array.isArray(data.incomes) ? data.incomes : [],
        categories: savedCategories
    };
}

function createDefaultCategories() {
    return Object.fromEntries(Object.entries(defaultCategories).map(([key, category]) => [key, { ...category }]));
}

function getCategories() {
    return state.data.categories;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

/* ================================================================
   TEMA CLARO E ESCURO
   Esta função aplica o tema salvo e atualiza o ícone do botão.
   ================================================================ */

function applyTheme(theme) {
    const isDark = theme === "dark";
    const themeButton = document.getElementById("themeButton");

    document.body.classList.toggle("dark-theme", isDark);
    document.getElementById("themeIcon").textContent = isDark ? "☀" : "☾";
    themeButton.setAttribute("aria-label", isDark ? "Ativar tema claro" : "Ativar tema escuro");
}

// Esta função troca o tema e grava a escolha para a próxima vez que abrir o site.
function toggleTheme() {
    const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";

    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function getMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    }).replace(/^\w/, letter => letter.toUpperCase());
}

function getMonthInputValue() {
    return state.selectedMonth;
}

function addMonths(monthKey, amount) {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 1 + amount, 1);

    return date.toISOString().slice(0, 7);
}

/* ================================================================
   FATURA E PARCELAMENTO
   Uma compra posterior ao fechamento pertence à fatura seguinte.
   ================================================================ */

function getInvoiceMonth(expense, card) {
    const purchase = new Date(`${expense.date}T12:00:00`);
    let invoiceMonth = purchase.toISOString().slice(0, 7);

    if (card && purchase.getDate() > Number(card.closingDay)) {
        invoiceMonth = addMonths(invoiceMonth, 1);
    }

    return invoiceMonth;
}

function expenseAppliesToMonth(expense, monthKey) {
    if (expense.type === "recurring") {
        return (expense.invoiceMonth || expense.date.slice(0, 7)) <= monthKey;
    }

    if (expense.type === "installment") {
        const firstMonth = expense.invoiceMonth || expense.date.slice(0, 7);
        const monthsPassed = monthDifference(firstMonth, monthKey);

        return monthsPassed >= 0 && monthsPassed < Number(expense.installments);
    }

    return (expense.invoiceMonth || expense.date.slice(0, 7)) === monthKey;
}

function monthDifference(fromMonth, toMonth) {
    const [fromYear, fromNumber] = fromMonth.split("-").map(Number);
    const [toYear, toNumber] = toMonth.split("-").map(Number);

    return (toYear - fromYear) * 12 + (toNumber - fromNumber);
}

function getExpenseAmountForMonth(expense, monthKey) {
    if (expense.type === "installment" && expenseAppliesToMonth(expense, monthKey)) {
        return Number(expense.amount) / Number(expense.installments);
    }

    return Number(expense.amount);
}

function getCurrentMonthExpenses() {
    return state.data.expenses.filter(expense => expenseAppliesToMonth(expense, state.selectedMonth));
}

function getCurrentMonthIncomes() {
    return state.data.incomes.filter(income => {
        if (income.type === "fixed") {
            return income.date.slice(0, 7) <= state.selectedMonth;
        }

        return income.date.slice(0, 7) === state.selectedMonth;
    });
}

/* ================================================================
   RENDERIZAÇÃO DA TELA
   ================================================================ */

function render() {
    document.getElementById("currentMonthLabel").textContent = getMonthLabel(state.selectedMonth);
    renderSummary();
    renderScreen();
    updateNavigation();
}

function renderSummary() {
    const incomes = getCurrentMonthIncomes().reduce((sum, income) => sum + Number(income.amount), 0);
    const expenses = getCurrentMonthExpenses().reduce((sum, expense) => sum + getExpenseAmountForMonth(expense, state.selectedMonth), 0);

    document.getElementById("incomeValue").textContent = formatMoney(incomes);
    document.getElementById("expenseValue").textContent = formatMoney(expenses);
    document.getElementById("balanceValue").textContent = formatMoney(incomes - expenses);
}

function renderScreen() {
    const screen = document.getElementById("screenContent");

    if (state.screen === "home") {
        screen.innerHTML = renderHome();
    }

    if (state.screen === "expenses") {
        screen.innerHTML = renderExpenses();
    }

    if (state.screen === "cards") {
        screen.innerHTML = renderCards();
    }

    if (state.screen === "more") {
        screen.innerHTML = renderMore();
    }

    bindScreenEvents();
}

function renderHome() {
    const expenses = getCurrentMonthExpenses();
    const incomes = getCurrentMonthIncomes();
    const latest = [...expenses.map(item => ({ ...item, kind: "expense" })), ...incomes.map(item => ({ ...item, kind: "income" }))]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    return `
        <div class="section-head">
            <h2>Visão do mês</h2>
            <button class="text-button" data-action="add-expense" type="button">Nova despesa</button>
        </div>

        ${renderCategoryTotals(expenses)}

        <div class="section-head">
            <h2>Lançamentos recentes</h2>
            <button class="text-button" data-screen-link="expenses" type="button">Ver todos</button>
        </div>

        <div class="list-card">
            ${latest.length ? latest.map(item => renderTransaction(item, item.kind)).join("") : renderEmpty("Ainda não há lançamentos neste mês.")}
        </div>
    `;
}

function renderCategoryTotals(expenses) {
    const currentCategories = getCategories();
    const totals = Object.keys(currentCategories).map(key => {
        const total = expenses
            .filter(expense => expense.category === key)
            .reduce((sum, expense) => sum + getExpenseAmountForMonth(expense, state.selectedMonth), 0);

        return { ...currentCategories[key], total };
    });

    return `
        <div class="categories-grid">
            ${totals.map(category => `
                <div class="category-total">
                    <span>${category.icon}</span>
                    <small>${category.name}</small>
                    <b>${formatMoney(category.total)}</b>
                </div>
            `).join("")}
        </div>
    `;
}

function renderExpenses() {
    const expenses = getCurrentMonthExpenses();
    const incomes = getCurrentMonthIncomes();
    const allTransactions = [
        ...expenses.map(item => ({ ...item, kind: "expense" })),
        ...incomes.map(item => ({ ...item, kind: "income" }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    const isPaymentView = state.expenseView === "payments";

    return `
        <div class="section-head">
            <h2>${isPaymentView ? "Controle de pagamentos" : "Todos os lançamentos"}</h2>
            <button class="text-button" data-action="add-income" type="button">Adicionar receita</button>
        </div>

        <!-- ABAS PARA ALTERNAR ENTRE O EXTRATO E A LISTA DE PAGAMENTO DAS DESPESAS -->
        <div class="status-tabs" role="tablist" aria-label="Visualização de despesas">
            <button class="status-tab ${!isPaymentView ? "active" : ""}" data-expense-view="all" type="button">Lançamentos</button>
            <button class="status-tab ${isPaymentView ? "active" : ""}" data-expense-view="payments" type="button">A pagar</button>
        </div>

        <div class="list-card">
            ${isPaymentView
                ? (expenses.length ? expenses.map(renderPaymentRow).join("") : renderEmpty("Não há despesas para pagar neste mês."))
                : (allTransactions.length ? allTransactions.map(item => renderTransaction(item, item.kind, true)).join("") : renderEmpty("Escolha outro mês ou adicione um lançamento."))}
        </div>
    `;
}

/* ================================================================
   CONTROLE DE PAGAMENTO
   Cada despesa tem um status independente em cada mês/parcelamento.
   ================================================================ */

function renderPaymentRow(expense) {
    const status = getPaymentStatus(expense, state.selectedMonth);
    const category = getCategories()[expense.category] || getCategories().outros || { icon: "•", name: "Outros" };
    const card = state.data.cards.find(savedCard => savedCard.id === expense.cardId);
    const dueDate = getPaymentDueDate(expense, state.selectedMonth, card);
    const installmentText = expense.type === "installment"
        ? `Parcela ${monthDifference(expense.invoiceMonth, state.selectedMonth) + 1} de ${expense.installments}`
        : card ? card.bank : "Pagamento direto";
    const statusText = status === "paid" ? "Pago" : status === "overdue" ? "Atrasado" : `Vence: ${formatDateForStatus(dueDate)}`;

    return `
        <div class="transaction-row payment-row ${status}">
            <div class="category-icon">${category.icon}</div>
            <div class="transaction-info">
                <strong>${escapeHtml(expense.description)}</strong>
                <small>${installmentText} · ${statusText}</small>
            </div>
            <span class="transaction-value expense">${formatMoney(getExpenseAmountForMonth(expense, state.selectedMonth))}</span>
            <button class="paid-button ${status === "paid" ? "is-paid" : ""}" data-payment-id="${expense.id}" aria-label="${status === "paid" ? "Marcar como não pago" : "Marcar como pago"}" type="button">${status === "paid" ? "✓" : "○"}</button>
        </div>
    `;
}

// Esta função retorna pago, atrasado ou pendente para a despesa no mês visualizado.
function getPaymentStatus(expense, monthKey) {
    if (expense.paidMonths?.includes(monthKey)) {
        return "paid";
    }

    const dueDate = getPaymentDueDate(expense, monthKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dueDate < today ? "overdue" : "pending";
}

// Para cartão, o prazo é o vencimento da fatura; para outros gastos, é o dia informado.
function getPaymentDueDate(expense, monthKey, card = null) {
    const foundCard = card || state.data.cards.find(savedCard => savedCard.id === expense.cardId);
    const day = foundCard ? Number(foundCard.dueDay) : Number(expense.date.slice(8, 10));
    const [year, month] = monthKey.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    return new Date(year, month - 1, Math.min(day, lastDay), 12);
}

function toggleExpensePaid(expenseId) {
    const expense = state.data.expenses.find(item => item.id === expenseId);

    if (!expense) return;

    expense.paidMonths = expense.paidMonths || [];
    const monthIndex = expense.paidMonths.indexOf(state.selectedMonth);

    if (monthIndex >= 0) {
        expense.paidMonths.splice(monthIndex, 1);
    } else {
        expense.paidMonths.push(state.selectedMonth);
    }

    saveData();
    render();
}

function renderTransaction(item, kind, canDelete = false) {
    const isIncome = kind === "income";
    const category = isIncome ? { icon: "↓", name: "Recebido" } : getCategories()[item.category] || getCategories().outros || { icon: "•", name: "Outros" };
    const card = state.data.cards.find(savedCard => savedCard.id === item.cardId);
    const installmentText = item.type === "fixed"
        ? "Receita fixa mensal"
        : item.type === "installment"
        ? `${monthDifference(item.invoiceMonth, state.selectedMonth) + 1}/${item.installments} parcelas`
        : item.type === "recurring" ? "Assinatura recorrente" : (card ? card.bank : item.paymentMethod || "À vista");
    const value = isIncome ? Number(item.amount) : getExpenseAmountForMonth(item, state.selectedMonth);

    return `
        <div class="transaction-row">
            <div class="category-icon">${category.icon}</div>
            <div class="transaction-info">
                <strong>${escapeHtml(item.description)}</strong>
                <small>${isIncome ? "Receita" : installmentText} · ${formatDate(item.date)}</small>
            </div>
            <span class="transaction-value ${isIncome ? "income" : "expense"}">${isIncome ? "+" : "−"} ${formatMoney(value)}</span>
            ${canDelete ? `<button class="delete-button" data-delete="${item.id}" data-kind="${kind}" aria-label="Excluir lançamento" type="button">×</button>` : ""}
        </div>
    `;
}

function renderCards() {
    return `
        <div class="section-head">
            <h2>Meus cartões</h2>
            <button class="text-button" data-action="add-card" type="button">Adicionar cartão</button>
        </div>

        ${state.data.cards.length ? state.data.cards.map(renderCard).join("") : renderEmpty("Cadastre seus cartões para acompanhar a fatura e o limite.")}
    `;
}

function renderCard(card) {
    const used = getCardUsedAmount(card);
    const available = Math.max(Number(card.limit) - used, 0);

    return `
        <article class="credit-card" style="background: linear-gradient(135deg, ${card.color}, ${darkenColor(card.color, 25)})">
            <span class="card-bank">${escapeHtml(card.bank)}</span>
            <button class="card-actions" data-action="edit-card" data-card-id="${card.id}" type="button">Editar</button>
            <p class="card-limit-label">Limite disponível</p>
            <strong class="card-available">${formatMoney(available)}</strong>
            <div class="card-footer">
                <span>Fatura: ${formatMoney(used)}</span>
                <span>Fecha dia ${card.closingDay} · Vence dia ${card.dueDay}</span>
            </div>
        </article>
    `;
}

function getCardUsedAmount(card) {
    return state.data.expenses
        .filter(expense => expense.cardId === card.id && expenseAppliesToMonth(expense, state.selectedMonth))
        .reduce((sum, expense) => sum + getExpenseAmountForMonth(expense, state.selectedMonth), 0);
}

function renderMore() {
    return `
        <div class="section-head"><h2>Organização</h2></div>
        <div class="settings-list">
            <button class="settings-row" data-action="add-income" type="button"><div class="category-icon">↓</div><div class="transaction-info"><strong>Adicionar recebido</strong><small>Salário, aluguel, renda extra...</small></div><span>›</span></button>
            <button class="settings-row" data-action="add-card" type="button"><div class="category-icon">▣</div><div class="transaction-info"><strong>Novo cartão</strong><small>Banco, limite, fechamento e vencimento</small></div><span>›</span></button>
            <button class="settings-row" data-action="manage-categories" type="button"><div class="category-icon">⌘</div><div class="transaction-info"><strong>Editar categorias</strong><small>Adicione, edite ou remova categorias de despesas</small></div><span>›</span></button>
            <!-- BOTÃO QUE BAIXA UM ARQUIVO DE BACKUP PARA LEVAR A OUTRO NAVEGADOR -->
            <button class="settings-row" data-action="export" type="button"><div class="category-icon">⇩</div><div class="transaction-info"><strong>Exportar backup</strong><small>Baixe seus cartões e lançamentos em um arquivo</small></div><span>›</span></button>
            <!-- BOTÃO QUE RESTAURA UM ARQUIVO DE BACKUP BAIXADO ANTERIORMENTE -->
            <button class="settings-row" data-action="import" type="button"><div class="category-icon">⇧</div><div class="transaction-info"><strong>Importar backup</strong><small>Use o arquivo salvo em outro navegador</small></div><span>›</span></button>
            <button class="settings-row" data-action="clear-data" type="button"><div class="category-icon">!</div><div class="transaction-info"><strong>Apagar todos os dados</strong><small>Esta ação não poderá ser desfeita</small></div><span>›</span></button>
        </div>
    `;
}

function renderEmpty(message) {
    return `<div class="empty-state"><div class="empty-icon">⌁</div><h3>Nada por aqui ainda</h3><p>${message}</p></div>`;
}

function updateNavigation() {
    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.screen === state.screen);
    });
}

/* ================================================================
   EVENTOS DA TELA PRINCIPAL
   ================================================================ */

function bindScreenEvents() {
    document.querySelectorAll("[data-action]").forEach(button => {
        button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.cardId));
    });

    document.querySelectorAll("[data-screen-link]").forEach(button => {
        button.addEventListener("click", () => {
            state.screen = button.dataset.screenLink;
            render();
        });
    });

    document.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => deleteTransaction(button.dataset.kind, button.dataset.delete));
    });

    document.querySelectorAll("[data-expense-view]").forEach(button => {
        button.addEventListener("click", () => {
            state.expenseView = button.dataset.expenseView;
            render();
        });
    });

    document.querySelectorAll("[data-payment-id]").forEach(button => {
        button.addEventListener("click", () => toggleExpensePaid(button.dataset.paymentId));
    });
}

function handleAction(action, cardId) {
    if (action === "add-expense") openExpenseForm();
    if (action === "add-income") openIncomeForm();
    if (action === "add-card") openCardForm();
    if (action === "manage-categories") openCategoryManager();
    if (action === "edit-card") openCardForm(state.data.cards.find(card => card.id === cardId));
    if (action === "export") exportData();
    if (action === "import") openImportForm();
    if (action === "clear-data") clearData();
}

function deleteTransaction(kind, id) {
    if (!confirm("Excluir este lançamento?")) return;

    state.data[kind === "income" ? "incomes" : "expenses"] = state.data[kind === "income" ? "incomes" : "expenses"].filter(item => item.id !== id);
    saveData();
    render();
}

/* ================================================================
   MODAIS E FORMULÁRIOS
   ================================================================ */

function openModal(title, content) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalContent").innerHTML = content;
    document.getElementById("modalBackdrop").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modalBackdrop").classList.add("hidden");
}

function openQuickAdd() {
    openModal("Adicionar lançamento", `
        <div class="quick-options">
            <button class="quick-option" id="quickExpense" type="button"><span>↗</span>Despesa</button>
            <button class="quick-option" id="quickIncome" type="button"><span>↓</span>Recebido</button>
        </div>
    `);

    document.getElementById("quickExpense").addEventListener("click", openExpenseForm);
    document.getElementById("quickIncome").addEventListener("click", openIncomeForm);
}

function openExpenseForm() {
    const cardOptions = state.data.cards.map(card => `<option value="${card.id}">${escapeHtml(card.bank)}</option>`).join("");
    const categoryOptions = Object.entries(getCategories()).map(([key, category]) => `<option value="${key}">${category.icon} ${category.name}</option>`).join("");

    openModal("Adicionar despesa", `
        <form id="expenseForm">
            <div class="form-group"><label for="expenseDescription">O que você gastou?</label><input id="expenseDescription" required placeholder="Ex.: Capa para celular"></div>
            <div class="form-row"><div class="form-group"><label for="expenseAmount">Valor total (R$)</label><input id="expenseAmount" type="number" min="0.01" step="0.01" required placeholder="0,00"></div><div class="form-group"><label for="expenseDate">Data da compra</label><input id="expenseDate" type="date" required value="${new Date().toISOString().slice(0, 10)}"></div></div>
            <div class="form-group"><label for="expenseCategory">Categoria</label><select id="expenseCategory">${categoryOptions}</select></div>
            <div class="form-group"><label for="paymentMethod">Como foi pago?</label><select id="paymentMethod"><option value="pix">Pix</option><option value="debito">Débito</option><option value="dinheiro">Dinheiro / espécie</option><option value="card">Cartão de crédito</option></select></div>
            <div id="cardSelectGroup" class="form-group" hidden><label for="expenseCard">Qual cartão?</label><select id="expenseCard"><option value="">Selecione um cartão</option>${cardOptions}</select></div>
            <div class="toggle-line"><label for="isInstallment">É uma compra parcelada ou recorrente?</label><label class="switch"><input id="isInstallment" type="checkbox"><span class="slider"></span></label></div>
            <div class="conditional-fields" id="installmentFields"><div class="form-group"><label for="expenseType">Tipo</label><select id="expenseType"><option value="installment">Compra parcelada</option><option value="recurring">Assinatura / valor fixo mensal</option></select></div><div id="installmentCountGroup" class="form-group"><label for="expenseInstallments">Quantidade de parcelas</label><input id="expenseInstallments" type="number" min="2" value="2"></div></div>
            <button class="submit-button" type="submit">Salvar despesa</button>
        </form>
    `);

    const method = document.getElementById("paymentMethod");
    const cardGroup = document.getElementById("cardSelectGroup");
    const installmentToggle = document.getElementById("isInstallment");
    const installmentFields = document.getElementById("installmentFields");
    const type = document.getElementById("expenseType");
    const countGroup = document.getElementById("installmentCountGroup");

    method.addEventListener("change", () => cardGroup.hidden = method.value !== "card");
    installmentToggle.addEventListener("change", () => installmentFields.classList.toggle("visible", installmentToggle.checked));
    type.addEventListener("change", () => countGroup.hidden = type.value === "recurring");
    document.getElementById("expenseForm").addEventListener("submit", saveExpense);
}

function saveExpense(event) {
    event.preventDefault();

    const paymentMethod = document.getElementById("paymentMethod").value;
    const cardId = paymentMethod === "card" ? document.getElementById("expenseCard").value : "";

    if (paymentMethod === "card" && !cardId) {
        alert("Selecione o cartão usado na compra.");
        return;
    }

    const date = document.getElementById("expenseDate").value;
    const card = state.data.cards.find(item => item.id === cardId);
    const isInstallment = document.getElementById("isInstallment").checked;
    const type = isInstallment ? document.getElementById("expenseType").value : "single";

    state.data.expenses.push({
        id: createId(),
        description: document.getElementById("expenseDescription").value.trim(),
        amount: Number(document.getElementById("expenseAmount").value),
        date,
        category: document.getElementById("expenseCategory").value,
        paymentMethod,
        cardId,
        type,
        installments: type === "installment" ? Number(document.getElementById("expenseInstallments").value) : 1,
        invoiceMonth: getInvoiceMonth({ date }, card)
    });

    saveData();
    closeModal();
    render();
}

function openIncomeForm() {
    openModal("Adicionar recebido", `
        <form id="incomeForm">
            <div class="form-group"><label for="incomeDescription">O que você recebeu?</label><input id="incomeDescription" required placeholder="Ex.: Salário"></div>
            <div class="form-row"><div class="form-group"><label for="incomeAmount">Valor (R$)</label><input id="incomeAmount" type="number" min="0.01" step="0.01" required placeholder="0,00"></div><div class="form-group"><label for="incomeDate">Data do recebimento</label><input id="incomeDate" type="date" required value="${new Date().toISOString().slice(0, 10)}"></div></div>
            <!-- OPÇÃO PARA TRANSFORMAR UM SALÁRIO OU RENDA EM RECEBIMENTO MENSAL AUTOMÁTICO -->
            <div class="toggle-line"><label for="isFixedIncome">É um recebido fixo mensal?</label><label class="switch"><input id="isFixedIncome" type="checkbox"><span class="slider"></span></label></div>
            <p class="form-help">Ex.: marque para salário, aluguel ou outra renda que se repete todo mês.</p>
            <button class="submit-button" type="submit">Salvar recebido</button>
        </form>
    `);

    document.getElementById("incomeForm").addEventListener("submit", event => {
        event.preventDefault();
        state.data.incomes.push({
            id: createId(),
            description: document.getElementById("incomeDescription").value.trim(),
            amount: Number(document.getElementById("incomeAmount").value),
            date: document.getElementById("incomeDate").value,
            type: document.getElementById("isFixedIncome").checked ? "fixed" : "single"
        });
        saveData();
        closeModal();
        render();
    });
}

/* ================================================================
   EDIÇÃO DE CATEGORIAS
   Permite criar, renomear e remover as categorias usadas nas despesas.
   ================================================================ */

function openCategoryManager() {
    const categoryRows = Object.entries(getCategories()).map(([id, category]) => `
        <div class="category-manager-row">
            <span class="category-icon">${escapeHtml(category.icon)}</span>
            <strong>${escapeHtml(category.name)}</strong>
            <button class="small-action" data-edit-category="${id}" type="button">Editar</button>
            ${id !== "outros" ? `<button class="small-action danger" data-remove-category="${id}" type="button">Remover</button>` : ""}
        </div>
    `).join("");

    openModal("Editar categorias", `
        <p class="form-help">As categorias aparecem no resumo mensal e no cadastro de despesas.</p>
        <div class="category-manager-list">${categoryRows}</div>
        <button id="newCategoryButton" class="secondary-button" type="button">+ Adicionar categoria</button>
    `);

    document.getElementById("newCategoryButton").addEventListener("click", () => openCategoryForm());
    document.querySelectorAll("[data-edit-category]").forEach(button => {
        button.addEventListener("click", () => openCategoryForm(button.dataset.editCategory));
    });
    document.querySelectorAll("[data-remove-category]").forEach(button => {
        button.addEventListener("click", () => removeCategory(button.dataset.removeCategory));
    });
}

// Abre o formulário para uma categoria nova ou uma categoria que será alterada.
function openCategoryForm(categoryId = null) {
    const category = categoryId ? getCategories()[categoryId] : null;

    openModal(category ? "Editar categoria" : "Adicionar categoria", `
        <form id="categoryForm">
            <div class="form-row"><div class="form-group"><label for="categoryIcon">Ícone</label><input id="categoryIcon" required maxlength="4" value="${category ? escapeHtml(category.icon) : "🏷️"}" placeholder="Ex.: 🚌"></div><div class="form-group"><label for="categoryName">Nome da categoria</label><input id="categoryName" required maxlength="28" value="${category ? escapeHtml(category.name) : ""}" placeholder="Ex.: Estudos"></div></div>
            <button class="submit-button" type="submit">${category ? "Salvar categoria" : "Adicionar categoria"}</button>
        </form>
    `);

    document.getElementById("categoryForm").addEventListener("submit", event => saveCategory(event, categoryId));
}

function saveCategory(event, categoryId) {
    event.preventDefault();
    const name = document.getElementById("categoryName").value.trim();
    const icon = document.getElementById("categoryIcon").value.trim();

    if (categoryId) {
        state.data.categories[categoryId] = { name, icon };
    } else {
        const newId = createCategoryId(name);
        state.data.categories[newId] = { name, icon };
    }

    saveData();
    openCategoryManager();
    render();
}

// Cria um identificador simples para a categoria e evita repetir nomes já existentes.
function createCategoryId(name) {
    const baseId = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "categoria";
    let id = baseId;
    let counter = 2;

    while (getCategories()[id]) {
        id = `${baseId}_${counter}`;
        counter += 1;
    }

    return id;
}

function removeCategory(categoryId) {
    const category = getCategories()[categoryId];

    if (!category || categoryId === "outros") return;

    if (!confirm(`Remover a categoria "${category.name}"? As despesas dela serão movidas para "Outros".`)) return;

    state.data.expenses.forEach(expense => {
        if (expense.category === categoryId) expense.category = "outros";
    });
    delete state.data.categories[categoryId];
    saveData();
    openCategoryManager();
    render();
}

function openCardForm(card = null) {
    const colors = ["#f46d43", "#e2ac20", "#3b82f6", "#7357e8", "#18a66b", "#e34f8d"];
    const selectedColor = card?.color || colors[2];

    openModal(card ? "Editar cartão" : "Adicionar cartão", `
        <form id="cardForm">
            <div class="form-group"><label for="cardBank">Nome do banco / cartão</label><input id="cardBank" required value="${card ? escapeHtml(card.bank) : ""}" placeholder="Ex.: Banco do Brasil"></div>
            <div class="form-group"><label for="cardLimit">Limite total (R$)</label><input id="cardLimit" type="number" min="0" step="0.01" required value="${card ? card.limit : ""}" placeholder="Ex.: 1500,00"></div>
            <div class="form-row"><div class="form-group"><label for="cardClosingDay">Dia de fechamento</label><input id="cardClosingDay" type="number" min="1" max="31" required value="${card ? card.closingDay : ""}" placeholder="Ex.: 25"></div><div class="form-group"><label for="cardDueDay">Dia de vencimento</label><input id="cardDueDay" type="number" min="1" max="31" required value="${card ? card.dueDay : ""}" placeholder="Ex.: 5"></div></div>
            <div class="form-group"><label>Cor do cartão</label><div class="color-options">${colors.map(color => `<label class="color-choice ${selectedColor === color ? "selected" : ""}" style="background:${color}"><input name="cardColor" type="radio" value="${color}" ${selectedColor === color ? "checked" : ""}></label>`).join("")}<input id="customColor" class="color-custom" type="color" value="${selectedColor}" aria-label="Escolher outra cor"></div></div>
            <button class="submit-button" type="submit">${card ? "Salvar alterações" : "Salvar cartão"}</button>
            ${card ? `<button class="secondary-button" id="deleteCardButton" type="button">Excluir cartão</button>` : ""}
        </form>
    `);

    document.querySelectorAll(".color-choice").forEach(choice => {
        choice.addEventListener("click", () => {
            document.querySelectorAll(".color-choice").forEach(item => item.classList.toggle("selected", item === choice));
            choice.querySelector("input").checked = true;
        });
    });

    document.getElementById("customColor").addEventListener("input", () => {
        document.querySelectorAll(".color-choice").forEach(item => {
            item.classList.remove("selected");
            item.querySelector("input").checked = false;
        });
    });

    document.getElementById("cardForm").addEventListener("submit", event => saveCard(event, card));

    if (card) document.getElementById("deleteCardButton").addEventListener("click", () => deleteCard(card.id));
}

function saveCard(event, existingCard) {
    event.preventDefault();
    const radioColor = document.querySelector("input[name='cardColor']:checked")?.value;
    const customColor = document.getElementById("customColor").value;
    const card = {
        id: existingCard?.id || createId(),
        bank: document.getElementById("cardBank").value.trim(),
        limit: Number(document.getElementById("cardLimit").value),
        closingDay: Number(document.getElementById("cardClosingDay").value),
        dueDay: Number(document.getElementById("cardDueDay").value),
        color: radioColor || customColor
    };

    if (existingCard) {
        state.data.cards = state.data.cards.map(item => item.id === card.id ? card : item);
    } else {
        state.data.cards.push(card);
    }

    saveData();
    closeModal();
    render();
}

function deleteCard(cardId) {
    if (!confirm("Excluir este cartão? As despesas já cadastradas serão mantidas como pagamento à vista.")) return;

    state.data.cards = state.data.cards.filter(card => card.id !== cardId);
    state.data.expenses.forEach(expense => {
        if (expense.cardId === cardId) expense.cardId = "";
    });
    saveData();
    closeModal();
    render();
}

/* ================================================================
   FERRAMENTAS AUXILIARES
   ================================================================ */

function exportData() {
    const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: state.data
    };
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `meu-bolso-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

/* ================================================================
   IMPORTAÇÃO DE BACKUP
   Lê um arquivo .json exportado pelo aplicativo e restaura os dados.
   ================================================================ */

function openImportForm() {
    openModal("Importar backup", `
        <p class="import-notice">Escolha o arquivo <b>.json</b> exportado no outro navegador. Os dados atuais serão substituídos após sua confirmação.</p>
        <div class="form-group"><label for="backupFile">Arquivo de backup</label><input id="backupFile" type="file" accept="application/json,.json"></div>
        <button id="importBackupButton" class="submit-button" type="button">Importar dados</button>
    `);

    document.getElementById("importBackupButton").addEventListener("click", importData);
}

// Esta função verifica se o arquivo é válido antes de substituir os dados salvos.
function importData() {
    const selectedFile = document.getElementById("backupFile").files[0];

    if (!selectedFile) {
        alert("Escolha um arquivo de backup primeiro.");
        return;
    }

    const reader = new FileReader();

    reader.onload = event => {
        try {
            const importedFile = JSON.parse(event.target.result);
            const importedData = importedFile.data || importedFile;

            if (!isValidBackup(importedData)) {
                throw new Error("Formato de backup inválido");
            }

            if (!confirm("Importar este backup? Os dados atuais deste navegador serão substituídos.")) {
                return;
            }

            state.data = normalizeData(importedData);
            saveData();
            closeModal();
            render();
            alert("Backup importado com sucesso!");
        } catch (error) {
            alert("Não foi possível importar esse arquivo. Escolha um backup válido do Meu Bolso.");
        }
    };

    reader.onerror = () => alert("O arquivo não pôde ser lido. Tente selecionar o backup novamente.");
    reader.readAsText(selectedFile);
}

// Confere se o backup possui as três listas principais do aplicativo.
function isValidBackup(data) {
    return data
        && Array.isArray(data.cards)
        && Array.isArray(data.expenses)
        && Array.isArray(data.incomes);
}

function clearData() {
    if (!confirm("Tem certeza? Todos os cartões, despesas e receitas serão apagados.")) return;
    state.data = { cards: [], expenses: [], incomes: [], categories: createDefaultCategories() };
    saveData();
    render();
}

function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

// Formata uma data já criada pela função de vencimento, sem alterar o fuso horário.
function formatDateForStatus(date) {
    return date.toLocaleDateString("pt-BR");
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function darkenColor(hex, percent) {
    const value = hex.replace("#", "");
    const number = parseInt(value, 16);
    const amount = Math.round(2.55 * percent);
    const red = Math.max(0, (number >> 16) - amount);
    const green = Math.max(0, ((number >> 8) & 0x00FF) - amount);
    const blue = Math.max(0, (number & 0x0000FF) - amount);

    return `#${(blue | (green << 8) | (red << 16)).toString(16).padStart(6, "0")}`;
}

/* ================================================================
   EVENTOS GLOBAIS
   ================================================================ */

document.getElementById("quickAddButton").addEventListener("click", openQuickAdd);
document.getElementById("closeModalButton").addEventListener("click", closeModal);
document.getElementById("themeButton").addEventListener("click", toggleTheme);
document.getElementById("modalBackdrop").addEventListener("click", event => {
    if (event.target.id === "modalBackdrop") closeModal();
});

document.getElementById("monthButton").addEventListener("click", () => {
    openModal("Escolher mês", `
        <div class="form-group"><label for="monthPicker">Mês que deseja visualizar</label><input id="monthPicker" type="month" value="${getMonthInputValue()}"></div>
        <button id="saveMonthButton" class="submit-button" type="button">Ver este mês</button>
    `);

    document.getElementById("saveMonthButton").addEventListener("click", () => {
        state.selectedMonth = document.getElementById("monthPicker").value;
        closeModal();
        render();
    });
});

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        state.screen = button.dataset.screen;
        render();
    });
});

// Aplica o tema que a pessoa escolheu anteriormente; claro é o padrão inicial.
applyTheme(localStorage.getItem(THEME_KEY) || "light");
render();
