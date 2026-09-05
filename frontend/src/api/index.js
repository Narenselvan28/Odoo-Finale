import api from "./axiosConfig";

// 🔐 Auth
export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

// 👥 Users & Roles
export const usersApi = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
};

export const rolesApi = {
  getAll: () => api.get("/roles"),
  create: (data) => api.post("/roles", data),
  remove: (id) => api.delete(`/roles/${id}`),
};

// 🏢 Customers & Tiers
export const customerTiersApi = {
  getAll: () => api.get("/customer-tiers"),
  getById: (id) => api.get(`/customer-tiers/${id}`),
  create: (data) => api.post("/customer-tiers", data),
  update: (id, data) => api.put(`/customer-tiers/${id}`, data),
  remove: (id) => api.delete(`/customer-tiers/${id}`),
};

export const customersApi = {
  getAll: () => api.get("/customers"),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
};

// 📦 Catalog (Products & Categories)
export const categoriesApi = {
  getAll: () => api.get("/categories"),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post("/categories", data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const productsApi = {
  getAll: () => api.get("/products"),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

// 📋 Quotations
export const quotationsApi = {
  getAll: () => api.get("/quotations"),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post("/quotations", data),
  update: (id, data) => api.put(`/quotations/${id}`, data),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),
  remove: (id) => api.delete(`/quotations/${id}`),
};

// ✅ Approvals & Audit
export const approvalsApi = {
  getAll: () => api.get("/approvals"),
  getById: (id) => api.get(`/approvals/${id}`),
  getByQuotation: (quotationId) => api.get(`/approvals/quotation/${quotationId}`),
  create: (data) => api.post("/approvals", data),
  action: (id, { status, reason }) => api.patch(`/approvals/${id}/action`, { status, reason }),
};

export const approvalAuditLogsApi = {
  getAll: () => api.get("/approval-audit-logs"),
  getById: (id) => api.get(`/approval-audit-logs/${id}`),
  create: (data) => api.post("/approval-audit-logs", data),
};

// 🏭 Inventory & Warehouses
export const inventoryApi = {
  getAll: () => api.get("/inventory"),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post("/inventory", data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  remove: (id) => api.delete(`/inventory/${id}`),
};

export const warehousesApi = {
  getAll: () => api.get("/warehouses"),
  getById: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post("/warehouses", data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  remove: (id) => api.delete(`/warehouses/${id}`),
};

// 💰 Price Lists & Rules
export const priceListsApi = {
  getAll: () => api.get("/price-lists"),
  getById: (id) => api.get(`/price-lists/${id}`),
  create: (data) => api.post("/price-lists", data),
  update: (id, data) => api.put(`/price-lists/${id}`, data),
  remove: (id) => api.delete(`/price-lists/${id}`),
};

export const priceListItemsApi = {
  getAll: () => api.get("/price-list-items"),
  getById: (id) => api.get(`/price-list-items/${id}`),
  create: (data) => api.post("/price-list-items", data),
  update: (id, data) => api.put(`/price-list-items/${id}`, data),
  remove: (id) => api.delete(`/price-list-items/${id}`),
};

export const discountRulesApi = {
  getAll: () => api.get("/discount-rules"),
  getById: (id) => api.get(`/discount-rules/${id}`),
  create: (data) => api.post("/discount-rules", data),
  update: (id, data) => api.put(`/discount-rules/${id}`, data),
  remove: (id) => api.delete(`/discount-rules/${id}`),
};

// 🤝 Negotiations
export const negotiationsApi = {
  getAll: () => api.get("/negotiations"),
  getById: (id) => api.get(`/negotiations/${id}`),
  create: (data) => api.post("/negotiations", data),
  update: (id, data) => api.put(`/negotiations/${id}`, data),
  remove: (id) => api.delete(`/negotiations/${id}`),
};

// 💳 Invoices & Fulfillment
export const invoicesApi = {
  getAll: () => api.get("/invoices"),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post("/invoices", data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
};

export const fulfillmentAllocationsApi = {
  getAll: () => api.get("/fulfillment-allocations"),
  getById: (id) => api.get(`/fulfillment-allocations/${id}`),
  create: (data) => api.post("/fulfillment-allocations", data),
  update: (id, data) => api.put(`/fulfillment-allocations/${id}`, data),
  remove: (id) => api.delete(`/fulfillment-allocations/${id}`),
};

// 🔄 Subscriptions & Billing
export const subscriptionPlansApi = {
  getAll: () => api.get("/subscription-plans"),
  getById: (id) => api.get(`/subscription-plans/${id}`),
  create: (data) => api.post("/subscription-plans", data),
  update: (id, data) => api.put(`/subscription-plans/${id}`, data),
  remove: (id) => api.delete(`/subscription-plans/${id}`),
};

export const subscriptionsApi = {
  getAll: () => api.get("/subscriptions"),
  getById: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post("/subscriptions", data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  remove: (id) => api.delete(`/subscriptions/${id}`),
};

export const billingSchedulesApi = {
  getAll: () => api.get("/billing-schedules"),
  getById: (id) => api.get(`/billing-schedules/${id}`),
  create: (data) => api.post("/billing-schedules", data),
  update: (id, data) => api.put(`/billing-schedules/${id}`, data),
  remove: (id) => api.delete(`/billing-schedules/${id}`),
};

// 💡 Product Recommendations
export const productRecommendationsApi = {
  getAll: () => api.get("/product-recommendations"),
  getById: (id) => api.get(`/product-recommendations/${id}`),
  create: (data) => api.post("/product-recommendations", data),
  update: (id, data) => api.put(`/product-recommendations/${id}`, data),
  remove: (id) => api.delete(`/product-recommendations/${id}`),
};

// ❤️ Deal Health, Events & Alerts
export const dealHealthApi = {
  getAll: () => api.get("/deal-health"),
  getById: (id) => api.get(`/deal-health/${id}`),
  create: (data) => api.post("/deal-health", data),
  update: (id, data) => api.put(`/deal-health/${id}`, data),
  remove: (id) => api.delete(`/deal-health/${id}`),
};

export const dealEventsApi = {
  getAll: () => api.get("/deal-events"),
  getById: (id) => api.get(`/deal-events/${id}`),
  create: (data) => api.post("/deal-events", data),
  update: (id, data) => api.put(`/deal-events/${id}`, data),
  remove: (id) => api.delete(`/deal-events/${id}`),
};

export const alertsApi = {
  getAll: () => api.get("/alerts"),
  getById: (id) => api.get(`/alerts/${id}`),
  create: (data) => api.post("/alerts", data),
  update: (id, data) => api.put(`/alerts/${id}`, data),
  remove: (id) => api.delete(`/alerts/${id}`),
};

// Backward compatibility alias
export const userApi = usersApi;
