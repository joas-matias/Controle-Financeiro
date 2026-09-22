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
    expenseCategoryFilter: "",
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
        categories: createDefaultCategories(),
        savings: createDefaultSavings(),
        goals: []
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
        categories: savedCategories,
        // RESERVA E METAS: BACKUPS ANTIGOS AINDA NÃO TINHAM ESSAS INFORMAÇÕES
        /*
    RESERVA

    Esta parte é importante porque existem dados antigos
    salvos no navegador.

    Um usuário que já utilizava o aplicativo antes desta
    atualização não terá necessariamente:

        reservedByMonth
        withdrawnByMonth

    Portanto, verificamos se essas informações existem.
    Se não existirem, criamos objetos vazios.
*/
savings: data.savings && typeof data.savings === "object"
    ? {
        // Recupera o valor total atualmente guardado.
        balance: Number(data.savings.balance) || 0,

        // Recupera os valores reservados por mês.
        reservedByMonth:
            data.savings.reservedByMonth &&
            typeof data.savings.reservedByMonth === "object"
                ? data.savings.reservedByMonth
                : {},

        // Recupera os valores retirados da reserva por mês.
        withdrawnByMonth:
            data.savings.withdrawnByMonth &&
            typeof data.savings.withdrawnByMonth === "object"
                ? data.savings.withdrawnByMonth
                : {}
    }
    : createDefaultSavings(),
        goals: Array.isArray(data.goals) ? data.goals.map(goal => ({
            id: goal.id,
            name: goal.name,
            target: Number(goal.target) || 0,
            saved: Number(goal.saved) || 0
        })) : []
    };
}

/* ================================================================
   ESTRUTURA PADRÃO DA RESERVA
   ================================================================ */

/*
    A reserva possui três informações principais:

    balance:
        Guarda quanto dinheiro existe atualmente na reserva.

    reservedByMonth:
        Registra quanto foi retirado do dinheiro disponível
        de cada mês para ser colocado na reserva.

    withdrawnByMonth:
        Registra quanto foi retirado da reserva e devolvido
        ao dinheiro disponível de cada mês.
*/
function createDefaultSavings() {
    return {
        // Valor total atualmente guardado na reserva.
        balance: 0,

        // Exemplo:
        // "2026-09": 1000
        //
        // Significa que R$ 1.000 foram reservados em setembro/2026.
        reservedByMonth: {},

        // Exemplo:
        // "2026-09": 300
        //
        // Significa que R$ 300 foram retirados da reserva
        // e voltaram a ficar disponíveis em setembro/2026.
        withdrawnByMonth: {}
    };
}

function createDefaultCategories() {
    return Object.fromEntries(Object.entries(defaultCategories).map(([key, category]) => [key, { ...category }]));
}

function getCategories() {
    return state.data.categories;
}

// Atalho para acessar a reserva guardada (valor total do cofrinho).
function getSavings() {
    return state.data.savings;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

/* ================================================================
   CONTROLE DAS MOVIMENTAÇÕES DA RESERVA
   ================================================================ */

/*
    Retorna quanto foi reservado utilizando o dinheiro
    disponível do mês selecionado.

    IMPORTANTE:

    Isso NÃO retorna o saldo total da reserva.

    Exemplo:

    Reserva total:
        R$ 5.000

    Reserva feita em setembro:
        R$ 1.000

    Esta função retornará:
        R$ 1.000

    e não R$ 5.000.
*/
function getReservedAmountForMonth(monthKey = state.selectedMonth) {
    const savings = getSavings();

    return Number(
        savings.reservedByMonth?.[monthKey]
    ) || 0;
}

/*
    Retorna quanto foi retirado da reserva
    e devolvido ao dinheiro disponível no mês.

    Exemplo:

    Você retirou R$ 300 da reserva em setembro.

    Então:

        withdrawnByMonth["2026-09"] = 300

    Esta função retornará:

        300
*/
function getWithdrawnAmountForMonth(monthKey = state.selectedMonth) {
    const savings = getSavings();

    return Number(
        savings.withdrawnByMonth?.[monthKey]
    ) || 0;
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

/* ================================================================
   RESUMO FINANCEIRO DO MÊS
   ================================================================ */

/*
    O resumo agora considera a reserva.

    A lógica financeira é:

        Recebido disponível
        =
        Recebido real
        - Valor reservado
        + Valor retirado da reserva

    Depois:

        Saldo do mês
        =
        Recebido disponível
        - Gastos

    ---------------------------------------------------------------

    EXEMPLO:

    Recebido:
        R$ 3.000

    Reservado:
        R$ 1.000

    Gastos:
        R$ 500

    Resultado:

        Recebido disponível = 3.000 - 1.000
        Recebido disponível = 2.000

        Saldo = 2.000 - 500
        Saldo = 1.500

    ---------------------------------------------------------------

    Se posteriormente você retirar R$ 300 da reserva:

        Recebido disponível = 3.000 - 1.000 + 300
        Recebido disponível = 2.300

        Saldo = 2.300 - 500
        Saldo = 1.800

    Ao mesmo tempo, a reserva passa de:

        R$ 1.000

    para:

        R$ 700
*/
function renderSummary() {

    /*
        Primeiro calculamos quanto realmente entrou
        no mês através das receitas.
    */
    const totalIncomes = getCurrentMonthIncomes()
        .reduce(
            (sum, income) => sum + Number(income.amount),
            0
        );

    /*
        Quanto foi reservado utilizando o dinheiro
        recebido neste mês?
    */
    const reserved = getReservedAmountForMonth(
        state.selectedMonth
    );

    /*
        Quanto foi retirado da reserva neste mês?
    */
    const withdrawn = getWithdrawnAmountForMonth(
        state.selectedMonth
    );

    /*
        Agora calculamos quanto realmente está
        disponível para utilização.

        Reserva diminui.
        Retirada da reserva aumenta.
    */
    const availableIncome = Math.max(
        totalIncomes - reserved + withdrawn,
        0
    );

    /*
        Calculamos os gastos normalmente.
    */
    const expenses = getCurrentMonthExpenses()
        .reduce(
            (sum, expense) =>
                sum +
                getExpenseAmountForMonth(
                    expense,
                    state.selectedMonth
                ),
            0
        );

    /*
        Finalmente calculamos o saldo disponível.
    */
    const balance = availableIncome - expenses;

    /*
        Atualiza o valor "Recebido" na interface.
    */
    document.getElementById("incomeValue").textContent =
        formatMoney(availableIncome);

    /*
        Atualiza o valor "Gasto".
    */
    document.getElementById("expenseValue").textContent =
        formatMoney(expenses);

    /*
        Atualiza o "Saldo do mês".
    */
    document.getElementById("balanceValue").textContent =
        formatMoney(balance);
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
    const categoryFilter = state.expenseCategoryFilter;

    // QUANDO UMA CATEGORIA ESTÁ SELECIONADA, SÓ AS DESPESAS DAQUELA CATEGORIA APARECEM
    const filteredExpenses = categoryFilter ? expenses.filter(expense => expense.category === categoryFilter) : expenses;

    const allTransactions = [
        ...filteredExpenses.map(item => ({ ...item, kind: "expense" })),
        // RECEITAS NÃO TÊM CATEGORIA, ENTÃO SOMEM DA LISTA QUANDO UM FILTRO ESTÁ ATIVO
        ...(categoryFilter ? [] : incomes.map(item => ({ ...item, kind: "income" })))
    ].sort((a, b) => b.date.localeCompare(a.date));

    const isPaymentView = state.expenseView === "payments";
    const emptyMessage = categoryFilter ? "Nenhuma despesa nesta categoria neste mês." : "Escolha outro mês ou adicione um lançamento.";

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

        <!-- FILTRO PARA VER APENAS OS GASTOS DE UMA CATEGORIA ESPECÍFICA NO MÊS -->
        <div class="filters-bar form-group">
            <label for="expenseCategoryFilter">Filtrar por categoria</label>
            <select id="expenseCategoryFilter">
                <option value="">Todas as categorias</option>
                ${renderCategoryFilterOptions(categoryFilter)}
            </select>
        </div>

        <div class="list-card">
            ${isPaymentView
                ? (filteredExpenses.length ? filteredExpenses.map(renderPaymentRow).join("") : renderEmpty(categoryFilter ? "Nenhuma despesa desta categoria para pagar neste mês." : "Não há despesas para pagar neste mês."))
                : (allTransactions.length ? allTransactions.map(item => renderTransaction(item, item.kind, true)).join("") : renderEmpty(emptyMessage))}
        </div>
    `;
}

// Monta as opções do seletor de categorias, marcando a que está selecionada no momento.
function renderCategoryFilterOptions(selectedCategory) {
    return Object.entries(getCategories()).map(([key, category]) => `
        <option value="${key}" ${selectedCategory === key ? "selected" : ""}>${category.icon} ${category.name}</option>
    `).join("");
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

    // O SELETOR DE CATEGORIA SÓ EXISTE NA TELA DE DESPESAS, POR ISSO O "?"
    document.getElementById("expenseCategoryFilter")?.addEventListener("change", event => {
        state.expenseCategoryFilter = event.target.value;
        render();
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
   RESERVA (COFRINHO) E METAS DE COMPRA
   A reserva guarda o valor total juntado; as metas são "cofrinhos"
   separados com um objetivo de valor e uma barra de progresso.
   ================================================================ */

/* ================================================================
   PAINEL DA RESERVA / COFRINHO
   ================================================================ */

/*
    Abre o painel que aparece quando o usuário toca
    no botão 🐷.

    Aqui mostramos:

        - total guardado
        - editar valor
        - adicionar valor
        - retirar valor
        - metas de compra
*/
function openSavingsPanel() {

    // Recupera o objeto da reserva.
    const savings = getSavings();

    // Recupera todas as metas cadastradas.
    const goals = state.data.goals;

    /*
        Calcula quanto foi recebido no mês.

        Esse valor é usado apenas para mostrar
        quanto existe disponível para uma possível reserva.
    */
    const monthIncome = getCurrentMonthIncomes()
        .reduce(
            (sum, income) => sum + Number(income.amount),
            0
        );

    /*
        Abre a janela principal da reserva.
    */
    openModal("Minha reserva", `

        <!-- =====================================================
             TOTAL DA RESERVA
             ===================================================== -->

        <div class="savings-total">
            <span>Total guardado</span>

            <strong>
                ${formatMoney(savings.balance)}
            </strong>
        </div>


        <!-- =====================================================
             BOTÕES DA RESERVA
             ===================================================== -->

        <div class="savings-actions">

            <!-- Editar manualmente o valor total -->
            <button
                class="secondary-button"
                id="editSavingsButton"
                type="button"
            >
                Editar valor
            </button>


            <!-- Retirar dinheiro da reserva -->
            <button
                class="secondary-button"
                id="withdrawSavingsButton"
                type="button"
            >
                Retirar valor
            </button>


            <!-- Adicionar dinheiro à reserva -->
            <button
                class="submit-button"
                id="addSavingsButton"
                type="button"
            >
                Adicionar valor
            </button>

        </div>


        <!-- =====================================================
             METAS DE COMPRA
             ===================================================== -->

        <div class="section-head">
            <h2>Minhas metas</h2>
        </div>

        <div
            class="goals-list"
            id="goalsList"
        >
            ${
                goals.length
                    ? goals.map(renderGoalRow).join("")
                    : renderEmpty(
                        "Crie uma meta para acompanhar o progresso de uma compra, como trocar de moto."
                    )
            }
        </div>

        <button
            class="secondary-button"
            id="newGoalButton"
            type="button"
        >
            + Nova meta
        </button>
    `);


    /* ============================================================
       BOTÃO EDITAR RESERVA
       ============================================================ */

    document
        .getElementById("editSavingsButton")
        .addEventListener(
            "click",
            () => openEditSavingsForm()
        );


    /* ============================================================
       BOTÃO ADICIONAR À RESERVA
       ============================================================ */

    document
        .getElementById("addSavingsButton")
        .addEventListener(
            "click",
            () => openAddSavingsForm(monthIncome)
        );


    /* ============================================================
       BOTÃO RETIRAR DA RESERVA
       ============================================================ */

    document
        .getElementById("withdrawSavingsButton")
        .addEventListener(
            "click",
            () => openWithdrawSavingsForm()
        );


    /* ============================================================
       NOVA META
       ============================================================ */

    document
        .getElementById("newGoalButton")
        .addEventListener(
            "click",
            () => openGoalForm()
        );


    /*
        Liga os eventos dos botões das metas.
    */
    bindGoalEvents();
}

// Liga os botões de cada meta (adicionar valor, editar e remover).
function bindGoalEvents() {
    document.querySelectorAll("[data-goal-add]").forEach(button => {
        button.addEventListener("click", () => openAddGoalAmountForm(button.dataset.goalAdd));
    });

    document.querySelectorAll("[data-goal-edit]").forEach(button => {
        button.addEventListener("click", () => openGoalForm(button.dataset.goalEdit));
    });

    document.querySelectorAll("[data-goal-delete]").forEach(button => {
        button.addEventListener("click", () => deleteGoal(button.dataset.goalDelete));
    });
}

// Monta o cartão de cada meta, com a barra que preenche conforme o valor guardado.
function renderGoalRow(goal) {
    const percent = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;

    return `
        <div class="goal-row">
            <div class="goal-header">
                <strong>${escapeHtml(goal.name)}</strong>
                <div class="goal-row-actions">
                    <button class="small-action" data-goal-edit="${goal.id}" type="button">Editar</button>
                    <button class="small-action danger" data-goal-delete="${goal.id}" type="button">Remover</button>
                </div>
            </div>

            <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${percent}%"></div></div>

            <div class="goal-footer">
                <small>${formatMoney(goal.saved)} de ${formatMoney(goal.target)}</small>
                <button class="text-button" data-goal-add="${goal.id}" type="button">+ Adicionar valor</button>
            </div>
        </div>
    `;
}

// Abre o formulário para trocar o valor total da reserva (ex.: depois de um rendimento).
function openEditSavingsForm() {
    const savings = getSavings();

    openModal("Editar valor da reserva", `
        <p class="form-help">Use esta opção quando o dinheiro guardado render no banco ou precisar de algum ajuste.</p>
        <div class="form-group"><label for="savingsNewValue">Novo valor total (R$)</label><input id="savingsNewValue" type="number" min="0" step="0.01" required value="${savings.balance}"></div>
        <button class="submit-button" id="saveSavingsValueButton" type="button">Salvar valor</button>
    `);

    document.getElementById("saveSavingsValueButton").addEventListener("click", () => {
        state.data.savings.balance = Number(document.getElementById("savingsNewValue").value);
        saveData();
        openSavingsPanel();
    });
}

// Abre o formulário para somar um novo valor à reserva, com atalho para usar o recebido do mês.
/* ================================================================
   ADICIONAR DINHEIRO À RESERVA
   ================================================================ */

/*
    Abre o formulário para colocar dinheiro no cofrinho.

    O usuário pode escolher:

        [ ] Diminuir do recebido total

    Se estiver marcado:

        Recebido: R$ 3.000
        Reserva:  R$ 1.000

        Recebido disponível:
        R$ 2.000

    Se estiver desmarcado:

        O dinheiro será simplesmente acrescentado
        ao saldo total da reserva sem alterar o
        recebido disponível daquele mês.
*/
// Abre o formulário para adicionar dinheiro à reserva.
function openAddSavingsForm(monthIncome) {

    // Descobre quanto já foi reservado neste mês.
    const reservedThisMonth =
        getReservedAmountForMonth(state.selectedMonth);

    // Calcula quanto do recebido ainda está disponível para reservar.
    const availableIncome =
        Math.max(monthIncome - reservedThisMonth, 0);


    openModal("Adicionar à reserva", `

        ${
            availableIncome > 0
                ? `
                    <button
                        class="secondary-button"
                        id="useIncomeButton"
                        type="button"
                    >
                        Usar recebido disponível:
                        ${formatMoney(availableIncome)}
                    </button>
                `
                : ""
        }


        <div class="form-group">

            <label for="savingsAddValue">
                Valor a adicionar (R$)
            </label>

            <input
                id="savingsAddValue"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0,00"
            >

        </div>


        <div class="toggle-line">

            <label for="deductFromIncome">
                Diminuir do recebido total
            </label>

            <label class="switch">

                <input
                    id="deductFromIncome"
                    type="checkbox"
                >

                <span class="slider"></span>

            </label>

        </div>


        <p class="form-help">
            Marque esta opção se o dinheiro reservado saiu
            do valor que você recebeu neste mês.
        </p>


        <button
            class="submit-button"
            id="confirmAddSavingsButton"
            type="button"
        >
            Adicionar
        </button>

    `);


    /*
        Botão para preencher automaticamente o valor
        disponível no mês.
    */
    if (availableIncome > 0) {

        document
            .getElementById("useIncomeButton")
            .addEventListener("click", () => {

                document.getElementById(
                    "savingsAddValue"
                ).value = availableIncome.toFixed(2);

                document.getElementById(
                    "deductFromIncome"
                ).checked = true;

            });
    }


    /*
        Botão "Adicionar".
    */
    document
        .getElementById("confirmAddSavingsButton")
        .addEventListener("click", () => {

            const amount = Number(
                document.getElementById(
                    "savingsAddValue"
                ).value
            );

            const deductFromIncome =
                document.getElementById(
                    "deductFromIncome"
                ).checked;


            /*
                Verifica se o valor é válido.
            */
            if (!amount || amount <= 0) {

                alert("Informe um valor válido.");

                return;
            }


            /*
                Não permite reservar mais dinheiro
                do que o recebido disponível.
            */
            if (
                deductFromIncome &&
                amount > availableIncome
            ) {

                alert(
                    `Você só possui ${formatMoney(
                        availableIncome
                    )} de recebido disponível para reservar neste mês.`
                );

                return;
            }


            /*
                Adiciona o dinheiro à reserva geral.
            */
            state.data.savings.balance += amount;


            /*
                Se o usuário marcou a opção,
                registramos que esse dinheiro saiu
                do recebido deste mês.
            */
            if (deductFromIncome) {

                state.data.savings.reservedByMonth =
                    state.data.savings.reservedByMonth || {};


                state.data.savings.reservedByMonth[
                    state.selectedMonth
                ] =
                    getReservedAmountForMonth(
                        state.selectedMonth
                    ) + amount;
            }


            /*
                Salva os dados.
            */
            saveData();


            /*
                Atualiza novamente o painel da reserva.
            */
            openSavingsPanel();

        });
}

/* ================================================================
   RETIRAR DINHEIRO DA RESERVA
   ================================================================ */

function openWithdrawSavingsForm() {

    // Recupera a reserva atual.
    const savings = getSavings();


    openModal("Retirar da reserva", `

        <p class="form-help">
            Retire um valor da sua reserva quando precisar utilizar
            o dinheiro guardado. O valor retirado ficará novamente
            disponível no saldo do mês.
        </p>


        <div class="savings-total">

            <span>
                Disponível na reserva
            </span>

            <strong>
                ${formatMoney(savings.balance)}
            </strong>

        </div>


        <div class="form-group">

            <label for="savingsWithdrawValue">
                Valor a retirar (R$)
            </label>

            <input
                id="savingsWithdrawValue"
                type="number"
                min="0.01"
                max="${savings.balance}"
                step="0.01"
                required
                placeholder="0,00"
            >

        </div>


        <button
            class="submit-button"
            id="confirmWithdrawSavingsButton"
            type="button"
        >
            Retirar da reserva
        </button>

    `);


    document
        .getElementById("confirmWithdrawSavingsButton")
        .addEventListener("click", () => {

            const amount = Number(
                document.getElementById(
                    "savingsWithdrawValue"
                ).value
            );


            /*
                Verifica se o valor digitado é válido.
            */
            if (!amount || amount <= 0) {

                alert("Informe um valor válido.");

                return;
            }


            /*
                Não permite retirar mais dinheiro
                do que existe na reserva.
            */
            if (amount > savings.balance) {

                alert(
                    `Você só possui ${formatMoney(
                        savings.balance
                    )} na reserva.`
                );

                return;
            }


            /*
                Diminui o valor total guardado.
            */
            state.data.savings.balance -= amount;


            /*
                Garante que o histórico de retiradas
                exista.
            */
            state.data.savings.withdrawnByMonth =
                state.data.savings.withdrawnByMonth || {};


            /*
                Registra quanto foi retirado neste mês.
            */
            state.data.savings.withdrawnByMonth[
                state.selectedMonth
            ] =
                getWithdrawnAmountForMonth(
                    state.selectedMonth
                ) + amount;


            /*
                Salva tudo.
            */
            saveData();

            render();


            /*
                Atualiza o painel da reserva.
            */
            openSavingsPanel();

        });
}





// Abre o formulário de uma meta nova ou de uma meta que já existe, para editar nome e valor.
function openGoalForm(goalId = null) {
    const goal = goalId ? state.data.goals.find(item => item.id === goalId) : null;

    openModal(goal ? "Editar meta" : "Nova meta", `
        <form id="goalForm">
            <div class="form-group"><label for="goalName">Nome da meta</label><input id="goalName" required maxlength="40" value="${goal ? escapeHtml(goal.name) : ""}" placeholder="Ex.: Trocar de moto"></div>
            <div class="form-group"><label for="goalTarget">Valor da meta (R$)</label><input id="goalTarget" type="number" min="0.01" step="0.01" required value="${goal ? goal.target : ""}" placeholder="Ex.: 20000,00"></div>
            ${goal ? `<div class="form-group"><label for="goalSaved">Valor já guardado (R$)</label><input id="goalSaved" type="number" min="0" step="0.01" value="${goal.saved}"></div>` : ""}
            <button class="submit-button" type="submit">${goal ? "Salvar meta" : "Criar meta"}</button>
            ${goal ? `<button class="secondary-button danger-text" id="deleteGoalButton" type="button">Excluir meta</button>` : ""}
        </form>
    `);

    document.getElementById("goalForm").addEventListener("submit", event => saveGoal(event, goalId));

    if (goal) document.getElementById("deleteGoalButton").addEventListener("click", () => deleteGoal(goal.id));
}

function saveGoal(event, goalId) {
    event.preventDefault();

    const name = document.getElementById("goalName").value.trim();
    const target = Number(document.getElementById("goalTarget").value);

    if (goalId) {
        const goal = state.data.goals.find(item => item.id === goalId);
        goal.name = name;
        goal.target = target;
        goal.saved = Number(document.getElementById("goalSaved").value);
    } else {
        state.data.goals.push({ id: createId(), name, target, saved: 0 });
    }

    saveData();
    openSavingsPanel();
}

function deleteGoal(goalId) {
    if (!confirm("Excluir esta meta? O progresso guardado nela será perdido.")) return;

    state.data.goals = state.data.goals.filter(goal => goal.id !== goalId);
    saveData();
    openSavingsPanel();
}

// Abre um formulário rápido para somar valor ao progresso de uma meta específica.
function openAddGoalAmountForm(goalId) {
    const goal = state.data.goals.find(item => item.id === goalId);

    if (!goal) return;

    openModal(`Adicionar valor: ${escapeHtml(goal.name)}`, `
        <div class="form-group"><label for="goalAddValue">Valor a adicionar (R$)</label><input id="goalAddValue" type="number" min="0.01" step="0.01" required placeholder="0,00"></div>
        <button class="submit-button" id="confirmGoalAddButton" type="button">Adicionar</button>
    `);

    document.getElementById("confirmGoalAddButton").addEventListener("click", () => {
        const amount = Number(document.getElementById("goalAddValue").value);

        if (!amount || amount <= 0) {
            alert("Informe um valor válido.");
            return;
        }

        goal.saved += amount;
        saveData();
        openSavingsPanel();
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
    if (!confirm("Tem certeza? Todos os cartões, despesas, receitas, a reserva e as metas serão apagados.")) return;
    state.data = { cards: [], expenses: [], incomes: [], categories: createDefaultCategories(), savings: createDefaultSavings(), goals: [] };
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
document.getElementById("piggyButton").addEventListener("click", openSavingsPanel);
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
