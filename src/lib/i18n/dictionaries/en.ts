export type Dictionary = {
  appName: string;
  demoBanner: string;
  nav: {
    dashboard: string;
    newSale: string;
    payments: string;
    products: string;
    customers: string;
    expenses: string;
    assistant: string;
    settings: string;
    more: string;
  };
  header: {
    merchant: string;
    selectMerchant: string;
  };
  common: {
    save: string;
    cancel: string;
    confirm: string;
    add: string;
    edit: string;
    create: string;
    close: string;
    loading: string;
    search: string;
    actions: string;
    status: string;
    amount: string;
    date: string;
    notes: string;
    empty: string;
    required: string;
    invalid: string;
    error: string;
    success: string;
    viewAll: string;
    active: string;
    inactive: string;
    pending: string;
    settled: string;
    expired: string;
    failed: string;
    completed: string;
    connected: string;
    disconnected: string;
    unknown: string;
    filter: string;
    from: string;
    to: string;
  };
  money: {
    xofNote: string;
    satsNote: string;
  };
  dashboard: {
    title: string;
    todayRevenue: string;
    todayReceipts: string;
    saleCount: string;
    outstanding: string;
    latestTransactions: string;
    latestPayments: string;
    quickActions: string;
    recordSale: string;
    viewSales: string;
    recordExpense: string;
    analyticsTitle: string;
    grossSalesHint: string;
    notProfitNote: string;
    grossSales: string;
    receipts: string;
    refunds: string;
    expenses: string;
    salesMinusExpenses: string;
  };
  sale: {
    title: string;
    historyTitle: string;
    product: string;
    quantity: string;
    unitPrice: string;
    paymentMethod: string;
    total: string;
    paid: string;
    due: string;
    cashPaid: string;
    addLine: string;
    removeLine: string;
    customerOptional: string;
    customerRequired: string;
    methods: {
      cash: string;
      credit: string;
    };
    states: {
      unpaid: string;
      partial: string;
      paid: string;
    };
    confirmTitle: string;
    confirmBody: string;
    successToast: string;
    errorToast: string;
    selectProduct: string;
    qtyError: string;
    priceError: string;
    empty: string;
    recordPayment: string;
  };
  payments: {
    title: string;
    history: string;
    description: string;
    method: string;
    kind: string;
    empty: string;
    cashOnlyNote: string;
    receiveLightning: string;
    lightningHistory: string;
  };
  lightning: {
    receiveTitle: string;
    amountTitle: string;
    amountHint: string;
    amountSats: string;
    descriptionPlaceholder: string;
    createInvoice: string;
    invoiceTitle: string;
    invoiceCreated: string;
    copyInvoice: string;
    copied: string;
    checking: string;
    settled: string;
    newInvoice: string;
    walletRequired: string;
    walletRequiredHint: string;
    demoModeNote: string;
  };
  products: {
    title: string;
    add: string;
    edit: string;
    name: string;
    category: string;
    unitPrice: string;
    trackStock: string;
    stockOnHand: string;
    empty: string;
    saved: string;
    archive: string;
  };
  customers: {
    title: string;
    add: string;
    owed: string;
    phone: string;
    empty: string;
    noneOwed: string;
    repay: string;
    repayTitle: string;
    saved: string;
  };
  expenses: {
    title: string;
    record: string;
    history: string;
    category: string;
    description: string;
    amount: string;
    empty: string;
    saved: string;
    occurredOn: string;
  };
  receipt: {
    title: string;
  };
  reliability: {
    walletOutage: string;
    aiOutage: string;
    bothOutage: string;
    useBookkeeping: string;
    draftNote: string;
    pendingPaymentNote: string;
    confirmedNote: string;
    skipToContent: string;
    installHint: string;
  };
  assistant: {
    title: string;
    disclaimer: string;
    placeholder: string;
    send: string;
    suggestions: string;
    suggestion: {
      todaySales: string;
      topDebtors: string;
      expenseSummary: string;
      weekSales: string;
      recordSale: string;
    };
    demoReply: string;
    confirmSale: string;
    rejectSale: string;
    saleSuggested: string;
    saleNeedsClarification: string;
    saleConfirmed: string;
    saleRejected: string;
    fallbackForm: string;
    fallbackFormHint: string;
    providerUnavailable: string;
    total: string;
    customer: string;
    method: string;
  };
  settings: {
    title: string;
    language: string;
    displayCurrency: string;
    wallet: string;
    profile: string;
    walletHint: string;
    connectWallet: string;
    disconnectWallet: string;
    walletLabel: string;
    walletLabelPlaceholder: string;
    nwcUri: string;
    nwcUriHint: string;
    walletConnected: string;
    walletDisconnected: string;
    walletPayWarning: string;
    receiveOnlyOk: string;
    capabilities: string;
    network: string;
    demoWalletMode: string;
    nostrPublish: string;
    nostrPublishHint: string;
    nostrPublishEnable: string;
    nostrPublishDisable: string;
    name: string;
    city: string;
    phone: string;
    savedDemo: string;
    english: string;
    french: string;
  };
};

export const en: Dictionary = {
  appName: "SatsPilot",
  demoBanner:
    "Live bookkeeping, Lightning receive, and an AI assistant that suggests — never spends — until you confirm.",
  nav: {
    dashboard: "Dashboard",
    newSale: "New sale",
    payments: "Payments",
    products: "Products",
    customers: "Customers",
    expenses: "Expenses",
    assistant: "Assistant",
    settings: "Settings",
    more: "More",
  },
  header: {
    merchant: "Merchant",
    selectMerchant: "Select merchant",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    add: "Add",
    edit: "Edit",
    create: "Create",
    close: "Close",
    loading: "Loading…",
    search: "Search",
    actions: "Actions",
    status: "Status",
    amount: "Amount",
    date: "Date",
    notes: "Notes",
    empty: "Nothing here yet",
    required: "Required",
    invalid: "Invalid value",
    error: "Something went wrong",
    success: "Saved",
    viewAll: "View all",
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    settled: "Settled",
    expired: "Expired",
    failed: "Failed",
    completed: "Completed",
    connected: "Connected",
    disconnected: "Disconnected",
    unknown: "Unknown",
    filter: "Filter",
    from: "From",
    to: "To",
  },
  money: {
    xofNote: "Amounts in XOF are bookkeeping values, not Lightning sats.",
    satsNote: "Sats amounts are separate from XOF — no exchange rate applied.",
  },
  dashboard: {
    title: "Dashboard",
    todayRevenue: "Today's gross sales",
    todayReceipts: "Today's receipts",
    saleCount: "Sales today",
    outstanding: "Outstanding balances",
    latestTransactions: "Latest sales",
    latestPayments: "Latest payments",
    quickActions: "Quick actions",
    recordSale: "Record sale",
    viewSales: "Sales history",
    recordExpense: "Record expense",
    analyticsTitle: "Stored-transaction summary",
    grossSalesHint: "Gross sales from finalized invoices (not profit).",
    notProfitNote:
      "Sales minus expenses is not profit — cost of goods sold is not tracked.",
    grossSales: "Gross sales",
    receipts: "Receipts",
    refunds: "Refunds",
    expenses: "Expenses",
    salesMinusExpenses: "Sales − expenses",
  },
  sale: {
    title: "New sale",
    historyTitle: "Sales history",
    product: "Product",
    quantity: "Quantity",
    unitPrice: "Unit price (XOF)",
    paymentMethod: "Payment method",
    total: "Total (XOF)",
    paid: "Paid",
    due: "Balance due",
    cashPaid: "Cash paid now (XOF)",
    addLine: "Add line",
    removeLine: "Remove",
    customerOptional: "Customer",
    customerRequired: "Customer required for unpaid balance",
    methods: {
      cash: "Cash",
      credit: "On account",
    },
    states: {
      unpaid: "Unpaid",
      partial: "Partial",
      paid: "Paid",
    },
    confirmTitle: "Confirm sale",
    confirmBody: "This finalizes the sale and writes ledger/payment records.",
    successToast: "Sale saved.",
    errorToast: "Could not save sale.",
    selectProduct: "Select a product",
    qtyError: "Quantity must be a whole number of at least 1.",
    priceError: "Unit price must be a whole XOF amount.",
    empty: "No sales recorded yet.",
    recordPayment: "Record cash payment",
  },
  payments: {
    title: "Payments",
    history: "Payment history",
    description: "Description",
    method: "Method",
    kind: "Type",
    empty: "No payments yet.",
    cashOnlyNote:
      "Cash receipts stay in XOF. Lightning sales are denominated in sats — no FX is applied.",
    receiveLightning: "Receive Lightning",
    lightningHistory: "Includes Lightning and cash settlements",
  },
  lightning: {
    receiveTitle: "Receive Lightning",
    amountTitle: "Amount in sats",
    amountHint:
      "Creates a SAT sale and a real Lightning invoice. Exact amount only — no XOF conversion.",
    amountSats: "Amount (sats)",
    descriptionPlaceholder: "What is this payment for?",
    createInvoice: "Create invoice",
    invoiceTitle: "Invoice",
    invoiceCreated: "Invoice created. Waiting for payment…",
    copyInvoice: "Copy BOLT11",
    copied: "Invoice copied",
    checking: "Checking wallet…",
    settled: "Payment settled and sale marked paid.",
    newInvoice: "New invoice",
    walletRequired: "Connect a wallet first",
    walletRequiredHint:
      "Add a receive-capable NWC connection in Settings before creating invoices.",
    demoModeNote:
      "DEMO MODE: LIGHTNING_PROVIDER=mock is active. Invoices are simulated — not a live Lightning payment.",
  },
  products: {
    title: "Products",
    add: "Add product",
    edit: "Edit product",
    name: "Name",
    category: "Category",
    unitPrice: "Unit price (XOF)",
    trackStock: "Track stock",
    stockOnHand: "Stock on hand",
    empty: "No products yet. Add your first item.",
    saved: "Product saved.",
    archive: "Archive",
  },
  customers: {
    title: "Customers",
    add: "Add customer",
    owed: "Amount owed (XOF)",
    phone: "Phone",
    empty: "No customers yet.",
    noneOwed: "No outstanding balance",
    repay: "Repay",
    repayTitle: "Record repayment",
    saved: "Customer saved.",
  },
  expenses: {
    title: "Expenses",
    record: "Record expense",
    history: "Expense history",
    category: "Category",
    description: "Description",
    amount: "Amount (XOF)",
    empty: "No expenses recorded.",
    saved: "Expense saved.",
    occurredOn: "Expense date",
  },
  receipt: {
    title: "Receipt",
  },
  reliability: {
    walletOutage:
      "Lightning wallet is unavailable or not connected. Cash bookkeeping still works.",
    aiOutage:
      "AI assistant is offline. Use suggested questions with ledger fallbacks or the sale form.",
    bothOutage:
      "Some online services are unavailable. You can still record cash sales and expenses.",
    useBookkeeping: "Open the sale form",
    draftNote:
      "Local draft only — not saved on the server until you confirm.",
    pendingPaymentNote:
      "Payment pending — not marked paid until the server verifies settlement.",
    confirmedNote: "Confirmed on the server.",
    skipToContent: "Skip to content",
    installHint: "Install SatsPilot for quicker access on this phone.",
  },
  assistant: {
    title: "AI assistant",
    disclaimer:
      "Suggests sales and answers bookkeeping questions. It never pays invoices, sends Bitcoin, or saves a sale until you confirm.",
    placeholder: "Ask about sales, or say “sold 2 rice bags to Amina”…",
    send: "Send",
    suggestions: "Suggested questions",
    suggestion: {
      todaySales: "How were today's sales?",
      topDebtors: "Who owes the most right now?",
      expenseSummary: "Summarize this week's expenses.",
      weekSales: "How were this week's sales?",
      recordSale: "I sold 2 bags of rice for cash",
    },
    demoReply:
      "The assistant uses your real ledger when available. Sales still need your confirmation.",
    confirmSale: "Confirm & record sale",
    rejectSale: "Dismiss",
    saleSuggested: "Suggested sale — review before saving",
    saleNeedsClarification: "Needs clarification before it can be saved",
    saleConfirmed: "Sale recorded.",
    saleRejected: "Suggestion dismissed.",
    fallbackForm: "Record sale without AI",
    fallbackFormHint:
      "If the assistant is unsure or offline, use the normal sale form.",
    providerUnavailable:
      "AI provider unavailable — answers use your ledger where possible, or the sale form.",
    total: "Total",
    customer: "Customer",
    method: "Payment",
  },
  settings: {
    title: "Settings",
    language: "Language",
    displayCurrency: "Display currency",
    wallet: "Lightning wallet (NWC)",
    profile: "Merchant profile",
    walletHint:
      "Paste a Nostr Wallet Connect URI. Prefer a receive-only app with make_invoice and lookup_invoice. The URI is encrypted server-side and never returned to the browser.",
    connectWallet: "Connect wallet",
    disconnectWallet: "Disconnect wallet",
    walletLabel: "Label (optional)",
    walletLabelPlaceholder: "Alby / Phoenix / …",
    nwcUri: "NWC connection URI",
    nwcUriHint:
      "Create the connection in your wallet with only make_invoice + lookup_invoice when permissions are offered.",
    walletConnected: "Wallet connected.",
    walletDisconnected: "Wallet disconnected.",
    walletPayWarning:
      "This connection also allows pay_invoice. Prefer a receive-only NWC app.",
    receiveOnlyOk: "Receive-only methods verified (no pay_invoice advertised).",
    capabilities: "Capabilities",
    network: "Network",
    demoWalletMode:
      "Demo provider mode is on (mock:// or LIGHTNING_PROVIDER=mock). Use a real nostr+walletconnect:// URI for live payments.",
    nostrPublish: "Receipt attestations (Nostr)",
    nostrPublishHint:
      "Opt in to publish minimal signed receipt hashes to a public relay. Never includes customer names, phones, balances, or NWC secrets. Keys are generated server-side — do not paste an nsec.",
    nostrPublishEnable: "Enable public relay publication",
    nostrPublishDisable: "Disable public relay publication",
    name: "Business name",
    city: "City",
    phone: "Phone",
    savedDemo: "Profile edits are not persisted in this step.",
    english: "English",
    french: "French",
  },
};
