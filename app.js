/**
 * ZeroBudget - Zero-based budgeting PWA
 * Data is stored in localStorage. Fully client-side.
 */

const STORAGE_KEY = 'zerobudget_data_v1';

// Default category groups and starter line items
const DEFAULT_GROUPS = [
  { name: 'Savings', items: [
    { name: 'Emergency Fund', planned: 0 },
    { name: 'Investments', planned: 0 },
    { name: 'Retirement', planned: 0 }
  ]},
  { name: 'Giving', items: [
    { name: 'Charity/Tithe', planned: 0 }
  ]},
  { name: 'Housing', items: [
    { name: 'Mortgage/Rent', planned: 0 },
    { name: 'Utilities', planned: 0 },
    { name: 'Internet', planned: 0 }
  ]},
  { name: 'Transportation', items: [
    { name: 'Gas/Automotive', planned: 0 },
    { name: 'Car Payment', planned: 0 },
    { name: 'Insurance', planned: 0 }
  ]},
  { name: 'Food', items: [
    { name: 'Grocery', planned: 0 },
    { name: 'Dining', planned: 0 }
  ]},
  { name: 'Personal', items: [
    { name: 'Phone', planned: 0 },
    { name: 'Personal Care', planned: 0 }
  ]},
  { name: 'Lifestyle', items: [
    { name: 'Entertainment', planned: 0 },
    { name: 'Subscriptions', planned: 0 }
  ]},
  { name: 'Health', items: [
    { name: 'Healthcare', planned: 0 }
  ]},
  { name: 'Debt', items: [
    { name: 'Credit Cards', planned: 0 }
  ]}
];

// Capital One category mapping suggestions
const CAP1_MAP = {
  'Merchandise': 'Lifestyle',
  'Dining': 'Food',
  'Other': 'Other',
  'Other Travel': 'Lifestyle',
  'Insurance': 'Insurance',
  'Healthcare': 'Health',
  'Health Care': 'Health',
  'Utilities': 'Housing',
  'Airfare': 'Lifestyle',
  'Other Services': 'Other',
  'Gas/Automotive': 'Transportation',
  'Entertainment': 'Lifestyle',
  'Grocery': 'Food',
  'Professional Services': 'Other',
  'Internet': 'Housing',
  'Lodging': 'Lifestyle',
  'Car Rental': 'Transportation',
  'Phone/Cable': 'Personal',
  'Payment/Credit': 'Other'
};

// ========== STATE ==========
let state = {
  currentMonth: getMonthKey(new Date()), // "2026-08"
  budgets: {},      // key: "2026-08" → { income: [], groups: [], transactions: [] }
  funds: [],         // sinking funds that carry over
  settings: {}
};

// ========== UTILITIES ==========
function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(key) {
  const [y, m] = key.split('-');
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n || 0);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toast(msg, duration = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ========== PERSISTENCE ==========
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  // Ensure current month exists
  ensureMonth(state.currentMonth);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save', e);
    toast('Could not save data');
  }
}

function ensureMonth(monthKey) {
  if (!state.budgets[monthKey]) {
    state.budgets[monthKey] = {
      income: [{ id: uid(), name: 'Primary Income', planned: 0, received: 0 }],
      groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)).map(g => ({
        ...g,
        items: g.items.map(i => ({ ...i, id: uid(), spent: 0 }))
      })),
      transactions: []
    };
  }
  return state.budgets[monthKey];
}

function getCurrentBudget() {
  return ensureMonth(state.currentMonth);
}

// ========== CALCULATIONS ==========
function calcSummary(budget) {
  const totalIncome = budget.income.reduce((s, i) => s + (Number(i.planned) || 0), 0);
  let totalPlanned = 0;
  let totalSpent = 0;

  budget.groups.forEach(g => {
    g.items.forEach(item => {
      totalPlanned += Number(item.planned) || 0;
      totalSpent += Number(item.spent) || 0;
    });
  });

  const leftToBudget = totalIncome - totalPlanned;
  return { totalIncome, totalPlanned, totalSpent, leftToBudget };
}

function recalcSpent(budget) {
  // Reset spent
  budget.groups.forEach(g => g.items.forEach(i => i.spent = 0));

  budget.transactions.forEach(t => {
    if (t.type === 'expense' && t.lineItemId) {
      for (const g of budget.groups) {
        const item = g.items.find(i => i.id === t.lineItemId);
        if (item) {
          item.spent = (item.spent || 0) + Number(t.amount);
          break;
        }
      }
    }
  });
}

// ========== RENDER ==========
function render() {
  document.getElementById('currentMonthLabel').textContent = formatMonth(state.currentMonth);
  renderSummary();
  renderBudgetList();
  renderTransactions();
  renderFunds();
  updateNav();
}

function renderSummary() {
  const budget = getCurrentBudget();
  const s = calcSummary(budget);

  document.getElementById('sumIncome').textContent = formatMoney(s.totalIncome);
  document.getElementById('sumSpent').textContent = formatMoney(s.totalSpent);
  document.getElementById('sumPlanned').textContent = formatMoney(s.totalPlanned);

  const spentEl = document.getElementById('sumSpent');
  const spentParent = spentEl.closest('.summary-item');
  spentParent.classList.remove('over');
  if (s.totalPlanned > 0 && s.totalSpent > s.totalPlanned) {
    spentParent.classList.add('over');
  }

  const remEl = document.getElementById('sumRemaining');
  remEl.textContent = formatMoney(s.leftToBudget);
  const parent = remEl.closest('.summary-item');
  parent.classList.remove('zero', 'negative');
  if (Math.abs(s.leftToBudget) < 0.01) parent.classList.add('zero');
  else if (s.leftToBudget < 0) parent.classList.add('negative');
}

function getPreviousMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return getMonthKey(new Date(y, m - 2, 1));
}

function previousMonthHasPlan(monthKey) {
  const prev = getPreviousMonthKey(monthKey);
  const pb = state.budgets[prev];
  if (!pb) return false;
  return pb.groups.some(g => g.items.some(i => (i.planned || 0) > 0)) ||
         pb.income.some(i => (i.planned || 0) > 0);
}

function copyPreviousMonthPlan({ markForReview = true } = {}) {
  const prev = getPreviousMonthKey(state.currentMonth);
  if (!state.budgets[prev]) {
    toast('No previous month found');
    return false;
  }
  const prevBudget = state.budgets[prev];
  const current = getCurrentBudget();
  const existingTx = current.transactions || [];

  current.income = JSON.parse(JSON.stringify(prevBudget.income)).map(i => ({
    ...i,
    received: 0,
    needsReview: markForReview
  }));
  current.groups = JSON.parse(JSON.stringify(prevBudget.groups)).map(g => ({
    ...g,
    items: g.items.map(i => ({
      ...i,
      id: uid(), // fresh ids for this month
      spent: 0,
      needsReview: markForReview
    }))
  }));
  current.transactions = existingTx;
  recalcSpent(current);
  saveState();
  return true;
}

function renderBudgetList() {
  const budget = getCurrentBudget();
  const container = document.getElementById('budgetList');
  const empty = document.getElementById('emptyBudget');
  const carryBanner = document.getElementById('carryForwardBanner');

  const hasAnyPlanned = budget.groups.some(g => g.items.some(i => i.planned > 0)) ||
                        budget.income.some(i => i.planned > 0);
  const canCarry = !hasAnyPlanned && !budget.dismissedCarry && previousMonthHasPlan(state.currentMonth);

  if (carryBanner) {
    carryBanner.style.display = canCarry ? 'block' : 'none';
  }

  if (!hasAnyPlanned && budget.transactions.length === 0 && !canCarry) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  if (!hasAnyPlanned && budget.transactions.length === 0 && canCarry) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  const needsReviewCount = budget.groups.reduce((n, g) =>
    n + g.items.filter(i => i.needsReview).length, 0);

  if (needsReviewCount > 0) {
    html += `<div class="card" style="margin-bottom:16px; border:1px solid #fbbf24; background:#fffbeb;">
      <div style="font-size:0.9rem; margin-bottom:10px;">
        <strong>${needsReviewCount}</strong> item${needsReviewCount === 1 ? '' : 's'} carried from last month — review amounts or confirm.
      </div>
      <button class="btn btn-secondary btn-block" onclick="confirmAllReviews()">Mark all as confirmed</button>
    </div>`;
  }

  // Income section
  html += `<div class="category-group">
    <div class="category-header">
      <span>Income</span>
      <button class="btn btn-sm btn-ghost" onclick="editIncome()">Edit</button>
    </div>`;
  budget.income.forEach(inc => {
    const badge = inc.needsReview ? '<span class="badge-update">Update</span>' : '';
    html += `
      <div class="line-item">
        <div class="line-item-top">
          <span class="line-item-name">${escapeHtml(inc.name)} ${badge}</span>
          <span class="amount-planned">${formatMoney(inc.planned)}</span>
        </div>
      </div>`;
  });
  html += `</div>`;

  // Expense groups — Savings / Investing first
  const orderedGroups = [...budget.groups].sort((a, b) => {
    const ao = GROUP_ORDER[a.name] ?? 50;
    const bo = GROUP_ORDER[b.name] ?? 50;
    return ao - bo;
  });

  orderedGroups.forEach(group => {
    if (group.items.length === 0) return;
    html += `<div class="category-group">
      <div class="category-header">
        <span>${escapeHtml(group.name)}</span>
        <button class="btn btn-sm btn-ghost" onclick="addLineItem('${group.name}')">+</button>
      </div>`;

    group.items.forEach(item => {
      const remaining = (item.planned || 0) - (item.spent || 0);
      const pct = item.planned > 0 ? Math.min(100, (item.spent / item.planned) * 100) : 0;
      const remClass = remaining > 0.01 ? 'positive' : remaining < -0.01 ? 'negative' : 'zero';
      const badge = item.needsReview ? '<span class="badge-update">Update</span>' : '';

      html += `
        <div class="line-item" onclick="editLineItem('${item.id}')">
          <div class="line-item-top">
            <span class="line-item-name">${escapeHtml(item.name)} ${badge}</span>
            <div class="line-item-amounts">
              <span class="amount-spent">${formatMoney(item.spent || 0)}</span>
              <span class="text-muted">/</span>
              <span class="amount-planned">${formatMoney(item.planned || 0)}</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${pct > 100 ? 'over' : ''}" style="width: ${Math.min(100, pct)}%"></div>
          </div>
          <div style="font-size:0.8rem; margin-top:2px;" class="amount-remaining ${remClass}">
            ${remaining >= 0 ? formatMoney(remaining) + ' left' : formatMoney(Math.abs(remaining)) + ' over'}
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  // Quick add button
  html += `<button class="btn btn-secondary btn-block mt-4" onclick="addLineItem()">+ Add Line Item</button>`;

  container.innerHTML = html;
}

window.confirmAllReviews = function() {
  const budget = getCurrentBudget();
  budget.income.forEach(i => { i.needsReview = false; });
  budget.groups.forEach(g => g.items.forEach(i => { i.needsReview = false; }));
  saveState();
  render();
  toast('All items confirmed');
};

function renderTransactions() {
  const budget = getCurrentBudget();
  const list = document.getElementById('transactionsList');
  const empty = document.getElementById('emptyTransactions');
  const chartEl = document.getElementById('categoryChart');
  const chartCard = document.getElementById('categoryChartCard');

  // Build category totals (expenses only)
  const totals = {};
  let grandTotal = 0;
  budget.transactions.forEach(t => {
    if (t.type !== 'expense') return;
    const name = findLineName(t.lineItemId, budget) || t.originalCategory || 'Uncategorized';
    totals[name] = (totals[name] || 0) + Number(t.amount);
    grandTotal += Number(t.amount);
  });

  const sortedCats = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (sortedCats.length === 0) {
    chartCard.style.display = 'none';
  } else {
    chartCard.style.display = 'block';
    chartEl.innerHTML = sortedCats.map(([name, amount]) => {
      const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
      return `
        <div class="cat-row">
          <div class="cat-row-top">
            <span class="cat-name">${escapeHtml(name)}</span>
            <span class="cat-amount">${formatMoney(amount)}</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="cat-pct">${pct.toFixed(0)}%</div>
        </div>`;
    }).join('');
  }

  if (!budget.transactions.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Sort newest first
  const sorted = [...budget.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  list.innerHTML = sorted.map(t => {
    const isIncome = t.type === 'income';
    const lineName = findLineName(t.lineItemId, budget) || (isIncome ? 'Income' : 'Uncategorized');
    return `
      <div class="line-item" style="margin-bottom:8px;">
        <div class="line-item-top">
          <div>
            <div class="line-item-name">${escapeHtml(t.description || lineName)}</div>
            <div class="text-muted" style="font-size:0.8rem;">${t.date} · ${escapeHtml(lineName)}</div>
          </div>
          <div style="font-weight:600; color:${isIncome ? 'var(--success)' : 'var(--text)'}">
            ${isIncome ? '+' : '-'}${formatMoney(t.amount)}
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderFunds() {
  const list = document.getElementById('fundsList');
  if (!state.funds.length) {
    list.innerHTML = `<p class="text-muted" style="text-align:center; padding:20px;">No sinking funds yet.<br>Create one for car repairs, vacation, etc.</p>`;
    return;
  }
  list.innerHTML = state.funds.map(f => `
    <div class="line-item">
      <div class="line-item-top">
        <span class="line-item-name">${escapeHtml(f.name)}</span>
        <span class="font-bold">${formatMoney(f.balance)}</span>
      </div>
      <div class="text-muted" style="font-size:0.8rem;">Goal: ${formatMoney(f.goal || 0)}</div>
    </div>
  `).join('');
}

function findLineName(id, budget) {
  if (!id) return null;
  const b = budget || getCurrentBudget();
  for (const g of b.groups) {
    const item = g.items.find(i => i.id === id);
    if (item) return item.name;
  }
  // Fallback: search all months (in case IDs were created elsewhere)
  for (const mk of Object.keys(state.budgets)) {
    const bb = state.budgets[mk];
    for (const g of bb.groups) {
      const item = g.items.find(i => i.id === id);
      if (item) return item.name;
    }
  }
  return null;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ========== NAVIGATION ==========
function updateNav() {
  // nothing special yet
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${btn.dataset.screen}`).classList.add('active');
  });
});

// ========== MONTH NAV ==========
document.getElementById('prevMonth').addEventListener('click', () => {
  const [y, m] = state.currentMonth.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  state.currentMonth = getMonthKey(d);
  ensureMonth(state.currentMonth);
  saveState();
  render();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  const [y, m] = state.currentMonth.split('-').map(Number);
  const d = new Date(y, m, 1);
  state.currentMonth = getMonthKey(d);
  ensureMonth(state.currentMonth);
  saveState();
  render();
});

// ========== MODALS ==========
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal-overlay').classList.remove('open');
  });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ========== TRANSACTIONS ==========
document.getElementById('fabAdd').addEventListener('click', () => {
  openAddTransaction();
});

function openAddTransaction() {
  const budget = getCurrentBudget();
  const select = document.getElementById('txnCategory');
  select.innerHTML = '<option value="">Select...</option>';

  budget.groups.forEach(g => {
    g.items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${g.name} › ${item.name}`;
      select.appendChild(opt);
    });
  });

  document.getElementById('txnAmount').value = '';
  document.getElementById('txnDesc').value = '';
  document.getElementById('txnDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('txnType').value = 'expense';
  document.getElementById('modalTxnTitle').textContent = 'Add Transaction';
  openModal('modalTransaction');
}

document.getElementById('formTransaction').addEventListener('submit', (e) => {
  e.preventDefault();
  const budget = getCurrentBudget();
  const amount = parseFloat(document.getElementById('txnAmount').value);
  if (isNaN(amount) || amount <= 0) return toast('Enter a valid amount');

  const txn = {
    id: uid(),
    amount,
    date: document.getElementById('txnDate').value,
    description: document.getElementById('txnDesc').value.trim(),
    type: document.getElementById('txnType').value,
    lineItemId: document.getElementById('txnCategory').value || null
  };

  budget.transactions.push(txn);
  recalcSpent(budget);
  saveState();
  closeModal('modalTransaction');
  render();
  toast('Transaction added');
});

// ========== LINE ITEMS ==========
function addLineItem(groupName = 'Other') {
  document.getElementById('lineName').value = '';
  document.getElementById('linePlanned').value = '';
  document.getElementById('lineGroup').value = groupName;
  document.getElementById('modalLineTitle').textContent = 'Add Line Item';
  openModal('modalLineItem');
}

document.getElementById('formLineItem').addEventListener('submit', (e) => {
  e.preventDefault();
  const budget = getCurrentBudget();
  const name = document.getElementById('lineName').value.trim();
  const groupName = document.getElementById('lineGroup').value;
  const planned = parseFloat(document.getElementById('linePlanned').value) || 0;

  if (!name) return;

  let group = budget.groups.find(g => g.name === groupName);
  if (!group) {
    group = { name: groupName, items: [] };
    budget.groups.push(group);
  }

  group.items.push({
    id: uid(),
    name,
    planned,
    spent: 0
  });

  saveState();
  closeModal('modalLineItem');
  render();
  toast('Line item added');
});

function editLineItem(id) {
  // Simple: for now just allow quick planned amount edit via prompt (can improve later)
  const budget = getCurrentBudget();
  let item = null;
  for (const g of budget.groups) {
    item = g.items.find(i => i.id === id);
    if (item) break;
  }
  if (!item) return;

  const newPlanned = prompt(`Planned amount for "${item.name}"`, item.planned);
  if (newPlanned === null) return;
  const val = parseFloat(newPlanned);
  if (!isNaN(val) && val >= 0) {
    item.planned = val;
    item.needsReview = false; // confirmed by editing
    saveState();
    render();
  }
}

function editIncome() {
  const budget = getCurrentBudget();
  const current = budget.income[0]?.planned || 0;
  const val = prompt('Total planned income for this month', current);
  if (val === null) return;
  const num = parseFloat(val);
  if (!isNaN(num) && num >= 0) {
    if (!budget.income.length) {
      budget.income.push({ id: uid(), name: 'Primary Income', planned: num, received: 0 });
    } else {
      budget.income[0].planned = num;
      budget.income[0].needsReview = false;
    }
    saveState();
    render();
    toast('Income updated');
  }
}

// ========== START BUDGET ==========
document.getElementById('startBudgetBtn')?.addEventListener('click', () => {
  editIncome();
});

// ========== FUNDS ==========
document.getElementById('addFundBtn').addEventListener('click', () => {
  const name = prompt('Fund name (e.g. Car Repairs, Vacation)');
  if (!name) return;
  const goal = parseFloat(prompt('Goal amount (optional)', '0')) || 0;
  state.funds.push({ id: uid(), name: name.trim(), balance: 0, goal });
  saveState();
  render();
  toast('Fund created');
});

// ========== IMPORT CSV (Capital One) ==========
document.getElementById('importCsvBtn').addEventListener('click', () => {
  document.getElementById('csvFileInput').click();
});

// Toggle help panel
document.getElementById('showImportHelpBtn')?.addEventListener('click', () => {
  const panel = document.getElementById('importHelpPanel');
  const btn = document.getElementById('showImportHelpBtn');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = 'How to get Capital One data ▴';
  } else {
    panel.style.display = 'none';
    btn.textContent = 'How to get Capital One data ▾';
  }
});

document.getElementById('csvFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) {
      toast('No data found in CSV');
      return;
    }

    // Detect Capital One format (Debit / Credit columns)
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const dateIdx = headers.findIndex(h => h.includes('transaction date') || h === 'date' || h.includes('posted'));
    const descIdx = headers.findIndex(h => h.includes('description') || h.includes('merchant'));
    const debitIdx = headers.findIndex(h => h === 'debit' || h.includes('debit'));
    const creditIdx = headers.findIndex(h => h === 'credit' || h.includes('credit'));
    const catIdx = headers.findIndex(h => h === 'category');

    if (dateIdx === -1) {
      toast('Could not find date column');
      return;
    }

    let imported = 0;
    let skippedPayments = 0;
    const monthsTouched = new Set();

    // Helper: find or create a line item in a specific month's budget
    function findOrCreateLineItem(budget, catName) {
      if (!catName) return null;

      const normalized = catName
        .replace(/Health Care/i, 'Healthcare')
        .replace(/Phone\/Cable/i, 'Phone');

      // Try to find existing
      for (const g of budget.groups) {
        const match = g.items.find(item =>
          item.name.toLowerCase() === normalized.toLowerCase() ||
          item.name.toLowerCase().includes(normalized.toLowerCase()) ||
          normalized.toLowerCase().includes(item.name.toLowerCase())
        );
        if (match) return match.id;
      }

      // Create new
      const groupName = CAP1_MAP[catName] || CAP1_MAP[normalized] || 'Other';
      let group = budget.groups.find(g => g.name === groupName);
      if (!group) {
        group = { name: groupName, items: [] };
        budget.groups.push(group);
      }
      const newItem = { id: uid(), name: normalized || catName, planned: 0, spent: 0 };
      group.items.push(newItem);
      return newItem.id;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const dateStr = row[dateIdx];
      const normalizedDate = normalizeDate(dateStr);
      if (!normalizedDate) continue;

      // Put the transaction in the month it actually belongs to
      const monthKey = normalizedDate.slice(0, 7); // "YYYY-MM"
      const budget = ensureMonth(monthKey);
      monthsTouched.add(monthKey);

      const desc = (descIdx >= 0 ? row[descIdx] : '').trim();
      const catName = (catIdx >= 0 ? (row[catIdx] || '').trim() : '');
      let amount = 0;
      let type = 'expense';

      const debitVal = debitIdx >= 0 && row[debitIdx] ? row[debitIdx].trim() : '';
      const creditVal = creditIdx >= 0 && row[creditIdx] ? row[creditIdx].trim() : '';

      if (debitVal) {
        amount = parseFloat(debitVal.replace(/[,$]/g, '')) || 0;
        type = 'expense';
      } else if (creditVal) {
        amount = parseFloat(creditVal.replace(/[,$]/g, '')) || 0;
        // Skip large card payments / autopay so they don't look like income
        const isPayment = /autopay|payment|paymt|pymt/i.test(desc) ||
                          (/payment\/credit/i.test(catName) && amount > 200);
        if (isPayment) {
          skippedPayments++;
          continue;
        }
        type = 'income'; // refunds, rewards, etc.
      }

      if (amount <= 0) continue;

      const lineItemId = findOrCreateLineItem(budget, catName);

      budget.transactions.push({
        id: uid(),
        amount,
        date: normalizedDate,
        description: desc,
        type,
        lineItemId,
        imported: true,
        originalCategory: catName
      });
      imported++;
    }

    // Recalculate spent for every month that received transactions
    monthsTouched.forEach(m => {
      recalcSpent(state.budgets[m]);
    });

    // Switch view to the most recent month that received data
    if (monthsTouched.size > 0) {
      const sortedMonths = [...monthsTouched].sort().reverse();
      state.currentMonth = sortedMonths[0];
    }

    saveState();
    render();

    let msg = `Imported ${imported} transactions across ${monthsTouched.size} month${monthsTouched.size === 1 ? '' : 's'}`;
    if (skippedPayments > 0) msg += ` (skipped ${skippedPayments} payments)`;
    toast(msg, 3500);
  } catch (err) {
    console.error(err);
    toast('Failed to parse CSV');
  }

  e.target.value = ''; // reset
});

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    // Simple CSV parser (handles quoted fields)
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function normalizeDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }
  // Fallback — parse as local date parts to avoid UTC shift
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

// ========== IMPORT CATEGORY TOTALS (Spend Analyzer style) ==========
document.getElementById('importCategoriesBtn').addEventListener('click', () => {
  const container = document.getElementById('importCategoryRows');
  container.innerHTML = '';
  // Pre-populate with common Capital One categories from the screenshot
  const defaults = [
    'Merchandise', 'Dining', 'Other', 'Other Travel', 'Insurance',
    'Healthcare', 'Utilities', 'Airfare', 'Other Services',
    'Gas/Automotive', 'Entertainment', 'Grocery'
  ];
  defaults.forEach(name => addImportRow(name));
  openModal('modalImportCategories');
});

function addImportRow(name = '') {
  const container = document.getElementById('importCategoryRows');
  const div = document.createElement('div');
  div.className = 'form-row';
  div.style.marginBottom = '8px';
  div.innerHTML = `
    <div class="form-group" style="flex:2">
      <input type="text" class="import-name" placeholder="Category name" value="${escapeHtml(name)}" />
    </div>
    <div class="form-group" style="flex:1">
      <input type="number" class="import-amount" placeholder="0.00" step="0.01" inputmode="decimal" />
    </div>
  `;
  container.appendChild(div);
}

document.getElementById('addImportRow').addEventListener('click', () => addImportRow());

document.getElementById('applyImportCategories').addEventListener('click', () => {
  const names = document.querySelectorAll('.import-name');
  const amounts = document.querySelectorAll('.import-amount');
  const budget = getCurrentBudget();
  let applied = 0;

  names.forEach((nameEl, idx) => {
    const name = nameEl.value.trim();
    const amount = parseFloat(amounts[idx].value) || 0;
    if (!name || amount <= 0) return;

    // Find or create a matching line item
    let found = false;
    for (const g of budget.groups) {
      const item = g.items.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (item) {
        item.planned = amount;
        found = true;
        break;
      }
    }
    if (!found) {
      // Use mapping or put in Other
      const groupName = CAP1_MAP[name] || 'Other';
      let group = budget.groups.find(g => g.name === groupName);
      if (!group) {
        group = { name: groupName, items: [] };
        budget.groups.push(group);
      }
      group.items.push({ id: uid(), name, planned: amount, spent: 0 });
    }
    applied++;
  });

  saveState();
  closeModal('modalImportCategories');
  render();
  toast(`Applied ${applied} category amounts`);
});

// ========== OTHER TOOLS ==========
document.getElementById('copyPrevBtn').addEventListener('click', () => {
  if (copyPreviousMonthPlan({ markForReview: true })) {
    render();
    toast('Copied previous month’s plan — review Update tags');
  }
});

document.getElementById('carryForwardBtn')?.addEventListener('click', () => {
  if (copyPreviousMonthPlan({ markForReview: true })) {
    render();
    toast('Budget carried forward — review Update tags');
  }
});

document.getElementById('dismissCarryBtn')?.addEventListener('click', () => {
  const banner = document.getElementById('carryForwardBanner');
  if (banner) banner.style.display = 'none';
  // Mark that user dismissed so we don't keep pushing — just hide for this render
  const budget = getCurrentBudget();
  budget.dismissedCarry = true;
  saveState();
  render();
});

document.getElementById('resetMonthBtn').addEventListener('click', () => {
  if (!confirm('Reset planned amounts and clear transactions for this month?')) return;
  const budget = getCurrentBudget();
  budget.income.forEach(i => { i.planned = 0; i.received = 0; });
  budget.groups.forEach(g => g.items.forEach(i => { i.planned = 0; i.spent = 0; }));
  budget.transactions = [];
  saveState();
  render();
  toast('Month reset');
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const budget = getCurrentBudget();
  let csv = 'Date,Type,Description,Category,Amount\n';
  budget.transactions.forEach(t => {
    const cat = findLineName(t.lineItemId) || '';
    csv += `${t.date},${t.type},"${(t.description || '').replace(/"/g, '""')}",${cat},${t.amount}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zerobudget-${state.currentMonth}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exported');
});

// ========== INSTALL PROMPT (PWA) ==========
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBanner').style.display = 'flex';
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('installBanner').style.display = 'none';
  }
  deferredPrompt = null;
});

// Hide banner if already installed / standalone
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  document.getElementById('installBanner').style.display = 'none';
}

// ========== INIT ==========
loadState();
render();

// Expose some functions for inline onclick
window.addLineItem = addLineItem;
window.editLineItem = editLineItem;
window.editIncome = editIncome;