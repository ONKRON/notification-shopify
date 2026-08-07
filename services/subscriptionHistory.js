const { Op, fn, col } = require("sequelize");
const Subscription = require("../models/Subscription");
const { fetchProductDetails, mapWithConcurrency } = require("./managerDashboard");

const SORTABLE_COLUMNS = new Set(["createdAt", "nickname", "email", "sku", "country"]);
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const PRODUCT_CONCURRENCY = 4;
const CSV_EXPORT_LIMIT = 5000;

const HISTORY_ATTRIBUTES = [
  "id",
  "nickname",
  "email",
  "sku",
  "inventory_id",
  "country",
  "createdAt",
  "notification_sent",
  "notification_sent_at",
  "notification_attempts",
  "notification_last_error",
  "manager_notification_status",
];

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE),
  );
  return { page, pageSize };
}

function parseSort(query) {
  const sortBy = SORTABLE_COLUMNS.has(query.sortBy) ? query.sortBy : "createdAt";
  const sortDir = String(query.sortDir || "").toLowerCase() === "asc" ? "ASC" : "DESC";
  return { sortBy, sortDir };
}

function buildWhere(query = {}) {
  const where = {};
  const and = [];

  const search = String(query.search || "").trim();
  if (search) {
    and.push({
      [Op.or]: [
        { sku: { [Op.iLike]: `%${search}%` } },
        { nickname: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ],
    });
  }

  const countries = String(query.country || "")
    .split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);
  if (countries.length === 1) where.country = countries[0];
  if (countries.length > 1) where.country = { [Op.in]: countries };

  const status = String(query.status || "").trim();
  if (status === "sent") where.notification_sent = true;
  if (status === "pending") {
    where.notification_sent = false;
    and.push({ notification_last_error: null });
  }
  if (status === "error") {
    where.notification_sent = false;
    and.push({ notification_last_error: { [Op.ne]: null } });
  }

  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
  if (dateFrom && !Number.isNaN(dateFrom.getTime())) {
    and.push({ createdAt: { [Op.gte]: dateFrom } });
  }
  const dateTo = query.dateTo ? new Date(query.dateTo) : null;
  if (dateTo && !Number.isNaN(dateTo.getTime())) {
    and.push({ createdAt: { [Op.lte]: dateTo } });
  }

  if (and.length) where[Op.and] = and;
  return where;
}

function deriveStatus(row) {
  if (row.notification_sent) return "sent";
  return row.notification_last_error ? "error" : "pending";
}

async function resolveProductTitles(rows) {
  const uniqueByKey = new Map();
  for (const row of rows) {
    const country = String(row.country || "").toUpperCase();
    const productId = String(row.inventory_id || "");
    const key = `${country}:${productId}`;
    if (!uniqueByKey.has(key)) {
      uniqueByKey.set(key, { country, productId, skus: [{ sku: row.sku }] });
    }
  }

  const resolved = await mapWithConcurrency(
    [...uniqueByKey.values()],
    PRODUCT_CONCURRENCY,
    fetchProductDetails,
  );

  const titlesByKey = new Map();
  for (const product of resolved) {
    titlesByKey.set(`${product.country}:${product.productId}`, product);
  }
  return titlesByKey;
}

async function getSubscriptionHistory(query = {}) {
  const { page, pageSize } = parsePagination(query);
  const { sortBy, sortDir } = parseSort(query);
  const where = buildWhere(query);

  const { rows, count } = await Subscription.findAndCountAll({
    attributes: HISTORY_ATTRIBUTES,
    where,
    order: [[sortBy, sortDir]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    raw: true,
  });

  const titlesByKey = await resolveProductTitles(rows);

  const items = rows.map((row) => {
    const country = String(row.country || "").toUpperCase();
    const productId = String(row.inventory_id || "");
    const product = titlesByKey.get(`${country}:${productId}`);
    return {
      id: row.id,
      createdAt: row.createdAt,
      nickname: row.nickname,
      email: row.email,
      sku: row.sku,
      country,
      inventoryId: productId,
      notificationSent: row.notification_sent,
      notificationSentAt: row.notification_sent_at,
      notificationAttempts: row.notification_attempts,
      notificationLastError: row.notification_last_error,
      managerNotificationStatus: row.manager_notification_status,
      status: deriveStatus(row),
      productTitle: product?.title || `SKU ${row.sku}`,
      productImageUrl: product?.imageUrl || null,
      productUrl: product?.productUrl || null,
      catalogStatus: product?.catalogStatus || "unavailable",
    };
  });

  return {
    items,
    total: count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    generatedAt: new Date().toISOString(),
  };
}

async function getHistoryFilterOptions() {
  const rows = await Subscription.findAll({
    attributes: [[fn("DISTINCT", col("country")), "country"]],
    raw: true,
  });
  return rows.map((row) => String(row.country || "").toUpperCase()).filter(Boolean).sort();
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[;"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

async function buildHistoryCsv(query = {}) {
  const where = buildWhere(query);
  const { sortBy, sortDir } = parseSort(query);
  const rows = await Subscription.findAll({
    attributes: HISTORY_ATTRIBUTES,
    where,
    order: [[sortBy, sortDir]],
    limit: CSV_EXPORT_LIMIT,
    raw: true,
  });

  const header = [
    "Дата",
    "Никнейм",
    "Email",
    "SKU",
    "Страна",
    "ID товара",
    "Статус",
    "Отправлено",
    "Попыток",
    "Ошибка",
  ];
  const lines = [header.join(";")];
  for (const row of rows) {
    lines.push(
      [
        row.createdAt ? new Date(row.createdAt).toISOString() : "",
        row.nickname,
        row.email,
        row.sku,
        row.country,
        row.inventory_id,
        deriveStatus(row),
        row.notification_sent_at ? new Date(row.notification_sent_at).toISOString() : "",
        row.notification_attempts,
        row.notification_last_error || "",
      ]
        .map(csvEscape)
        .join(";"),
    );
  }
  return lines.join("\n");
}

module.exports = {
  buildHistoryCsv,
  getHistoryFilterOptions,
  getSubscriptionHistory,
};
