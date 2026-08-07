const { createApp, ref, computed, onMounted } = Vue;

// Валидированная категориальная палитра (dataviz skill, references/palette.md) —
// фиксированный порядок слотов, adjacent-pair CVD ΔE >= 8 в обоих режимах.
const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#4a3aa7", // violet
];

const COUNTRY_NAMES = {
  US: "США",
  UK: "Великобритания",
  DE: "Германия",
  PL: "Польша",
  FR: "Франция",
  IT: "Италия",
  ES: "Испания",
};
const countryName = (code) => COUNTRY_NAMES[code] || code;

const TREND_CHART_LAYOUT = {
  width: 640,
  height: 220,
  marginLeft: 42,
  marginRight: 8,
  marginTop: 12,
  marginBottom: 28,
};

function niceMax(value) {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

createApp({
  setup() {
    const data = ref(null);
    const loading = ref(true);
    const error = ref("");

    const digestPreview = ref(null);
    const digestLoading = ref(false);
    const digestError = ref("");

    const topProductsCountry = ref(null);

    const formatDay = (day) =>
      new Date(day).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

    const TREND_TOOLTIP_SKU_LIMIT = 8;
    const formatTrendTooltip = (point) => {
      const header = `${formatDay(point.day)}: ${point.subscribed} подписок, ${point.sent} отправок`;
      if (!point.skus || !point.skus.length) return header;
      const shown = point.skus.slice(0, TREND_TOOLTIP_SKU_LIMIT);
      const lines = shown.map((row) => `  ${row.sku} (${row.country}) — ${row.count}`);
      const hiddenCount = point.skus.length - shown.length;
      if (hiddenCount > 0) lines.push(`  … и ещё ${hiddenCount}`);
      return [header, ...lines].join("\n");
    };

    const trendChart = computed(() => {
      if (!data.value || !data.value.dailyTrend.length) return null;
      const points = data.value.dailyTrend;
      const { width, height, marginLeft, marginRight, marginTop, marginBottom } =
        TREND_CHART_LAYOUT;
      const plotWidth = width - marginLeft - marginRight;
      const plotHeight = height - marginTop - marginBottom;
      const maxValue = points.reduce(
        (max, point) => Math.max(max, point.subscribed, point.sent),
        0,
      );
      const yMax = niceMax(maxValue);
      const groupWidth = plotWidth / points.length;
      const barGap = Math.min(1.5, groupWidth / 6);
      const barWidth = Math.max((groupWidth - barGap * 3) / 2, 1);

      const bars = points.flatMap((point, index) => {
        const groupX = marginLeft + index * groupWidth;
        const subscribedHeight = (point.subscribed / yMax) * plotHeight;
        const sentHeight = (point.sent / yMax) * plotHeight;
        return [
          {
            key: `${point.day}-sub`,
            x: groupX + barGap,
            y: marginTop + plotHeight - subscribedHeight,
            width: barWidth,
            height: subscribedHeight,
            color: "var(--accent)",
          },
          {
            key: `${point.day}-sent`,
            x: groupX + barGap * 2 + barWidth,
            y: marginTop + plotHeight - sentHeight,
            width: barWidth,
            height: sentHeight,
            color: "var(--accent-dark)",
          },
        ];
      });

      const yTicks = [0, yMax / 2, yMax].map((value) => ({
        value: Math.round(value),
        y: marginTop + plotHeight - (value / yMax) * plotHeight,
      }));

      const xLabelStep = Math.max(1, Math.ceil(points.length / 6));
      const xTicks = points
        .map((point, index) => ({ point, index }))
        .filter(({ index }) => index % xLabelStep === 0 || index === points.length - 1)
        .map(({ point, index }) => ({
          key: point.day,
          label: formatDay(point.day),
          x: marginLeft + index * groupWidth + groupWidth / 2,
        }));

      const hitAreas = points.map((point, index) => ({
        key: `hit-${point.day}`,
        x: marginLeft + index * groupWidth,
        width: groupWidth,
        tooltip: formatTrendTooltip(point),
      }));

      return {
        ...TREND_CHART_LAYOUT,
        plotHeight,
        bars,
        yTicks,
        xTicks,
        hitAreas,
      };
    });

    const countryOptions = computed(() => {
      if (!data.value) return [];
      return [...data.value.topSkusByCountry]
        .map((entry) => entry.country)
        .sort((a, b) => countryName(a).localeCompare(countryName(b), "ru"));
    });

    const topProductsForCountry = computed(() => {
      if (!data.value) return [];
      const entry = data.value.topSkusByCountry.find(
        (item) => item.country === topProductsCountry.value,
      );
      return entry ? entry.skus : [];
    });

    const topProductsBars = computed(() => {
      const max = topProductsForCountry.value.reduce(
        (top, sku) => Math.max(top, sku.totalCount),
        0,
      );
      return topProductsForCountry.value.map((sku, index) => ({
        sku: sku.sku,
        count: sku.totalCount,
        color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length],
        widthPct: max > 0 ? Math.max((sku.totalCount / max) * 100, 4) : 0,
      }));
    });

    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("ru-RU") : "Дата неизвестна";

    const formatDuration = (ms) => {
      if (!Number.isFinite(ms)) return "—";
      const totalMinutes = Math.round(ms / 60000);
      if (totalMinutes < 60) return `${totalMinutes} мин`;
      const hours = Math.floor(totalMinutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days} дн ${hours % 24} ч`;
      return `${hours} ч ${totalMinutes % 60} мин`;
    };

    const managerStatusLabels = {
      not_required: "Не требуется",
      pending: "Ожидает",
      sent: "Отправлено",
      failed: "Ошибка",
    };

    async function loadAnalytics() {
      loading.value = true;
      error.value = "";
      try {
        const response = await fetch("/api/manager/analytics", {
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(`Не удалось загрузить данные: ${response.status}`);
        data.value = await response.json();
        if (!topProductsCountry.value && data.value.activeByCountry.length) {
          topProductsCountry.value = [...data.value.activeByCountry].sort(
            (a, b) => Number(b.count) - Number(a.count),
          )[0].country;
        }
      } catch (loadError) {
        error.value = loadError.message;
      } finally {
        loading.value = false;
      }
    }

    async function loadDigestPreview() {
      if (digestPreview.value) {
        digestPreview.value = null;
        return;
      }

      digestLoading.value = true;
      digestError.value = "";
      try {
        const response = await fetch("/api/manager/digest/preview", {
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(`Не удалось загрузить превью: ${response.status}`);
        const result = await response.json();
        digestPreview.value = result.message;
      } catch (loadError) {
        digestError.value = loadError.message;
      } finally {
        digestLoading.value = false;
      }
    }

    onMounted(() => {
      loadAnalytics();
    });

    return {
      data,
      loading,
      error,
      digestPreview,
      digestLoading,
      digestError,
      loadDigestPreview,
      formatDate,
      formatDay,
      formatDuration,
      managerStatusLabels,
      loadAnalytics,
      trendChart,
      countryOptions,
      countryName,
      topProductsCountry,
      topProductsBars,
    };
  },
  template: `
    <div class="site-topline"></div>
    <header class="header">
      <div class="header__primary">
        <a class="header__logo" href="/manager/subscriptions" aria-label="ONKRON — панель подписок">
          <img src="/manager/assets/onkron-logo.svg" alt="ONKRON">
        </a>
        <div class="header__tools">
          <div class="updated" v-if="data">Обновлено {{ formatDate(data.generatedAt) }}</div>
          <button class="button" type="button" :disabled="loading" @click="loadAnalytics">
            {{ loading ? 'Обновляем…' : 'Обновить' }}
          </button>
        </div>
      </div>
      <div class="header__nav-bar">
        <nav class="header__nav" aria-label="Навигация панели">
          <a class="header__nav-link" href="/manager/subscriptions">Подписка на товары</a>
          <a class="header__nav-link header__nav-link--active" href="/manager/analytics">Аналитика</a>
          <a class="header__nav-link" href="/manager/history">История</a>
        </nav>
      </div>
    </header>

    <main class="main">
      <section class="section actions-panel">
        <div class="section__head"><h2>Отчёты и экспорт</h2></div>
        <div class="actions-panel__grid">
          <a class="action-card" href="/download-analytics-csv">
            <span class="action-card__icon">📄</span>
            <span class="action-card__label">Скачать CSV</span>
            <span class="action-card__hint">Плоский файл, все секции подряд</span>
          </a>
          <a class="action-card" href="/download-analytics-excel">
            <span class="action-card__icon">📊</span>
            <span class="action-card__label">Скачать Excel</span>
            <span class="action-card__hint">Отдельный лист на каждую страну</span>
          </a>
          <button class="action-card" type="button" :disabled="digestLoading" @click="loadDigestPreview">
            <span class="action-card__icon">🤖</span>
            <span class="action-card__label">{{ digestLoading ? 'Считаем…' : (digestPreview ? 'Скрыть превью дайджеста' : 'Превью дайджеста') }}</span>
            <span class="action-card__hint">То же, что уходит в Bitrix по понедельникам</span>
          </button>
        </div>
      </section>

      <section v-if="digestError || digestPreview" class="section digest-preview-section">
        <div class="section__head"><h2>Превью дайджеста</h2></div>
        <div v-if="digestError" class="state state--error">{{ digestError }}</div>
        <pre v-else class="digest-preview">{{ digestPreview }}</pre>
      </section>

      <div v-if="loading" class="app-loading">Загружаем аналитику…</div>
      <div v-else-if="error" class="state state--error">{{ error }}</div>
      <template v-else-if="data">
        <div class="summary summary--analytics">
          <div class="metric"><strong>{{ data.totalActiveSubscriptions }}</strong><span>Активных подписок</span></div>
          <div class="metric"><strong>{{ data.sentLast24h }}</strong><span>Отправлено за 24ч</span></div>
          <div class="metric"><strong>{{ data.sentLast7d }}</strong><span>Отправлено за 7 дней</span></div>
          <div class="metric"><strong>{{ data.sentLast30d }}</strong><span>Отправлено за 30 дней</span></div>
          <div class="metric"><strong>{{ formatDuration(data.avgWaitTimeMs) }}</strong><span>Среднее время ожидания</span></div>
          <div class="metric"><strong>{{ data.errorRate30d }}%</strong><span>Доля ошибок за 30 дней</span></div>
        </div>

        <section class="section">
          <div class="section__head"><h2>Тренд и топ товаров</h2></div>
          <div class="chart-grid">
            <div class="chart-card">
              <h3 class="chart-card__title">Подписки и отправки за 30 дней</h3>
              <svg
                v-if="trendChart"
                class="chart-svg"
                :viewBox="'0 0 ' + trendChart.width + ' ' + trendChart.height"
                preserveAspectRatio="none"
                role="img"
                aria-label="Тренд подписок и отправок за 30 дней"
              >
                <line
                  v-for="tick in trendChart.yTicks"
                  :key="'grid-' + tick.value"
                  class="chart-grid-line"
                  :x1="trendChart.marginLeft"
                  :x2="trendChart.width - trendChart.marginRight"
                  :y1="tick.y"
                  :y2="tick.y"
                />
                <text
                  v-for="tick in trendChart.yTicks"
                  :key="'ylabel-' + tick.value"
                  class="chart-axis-label"
                  :x="trendChart.marginLeft - 6"
                  :y="tick.y"
                  text-anchor="end"
                  dominant-baseline="middle"
                >{{ tick.value }}</text>
                <text
                  v-for="tick in trendChart.xTicks"
                  :key="'xlabel-' + tick.key"
                  class="chart-axis-label"
                  :x="tick.x"
                  :y="trendChart.height - 8"
                  text-anchor="middle"
                >{{ tick.label }}</text>
                <rect
                  v-for="bar in trendChart.bars"
                  :key="bar.key"
                  :x="bar.x"
                  :y="bar.y"
                  :width="bar.width"
                  :height="bar.height"
                  :fill="bar.color"
                />
                <rect
                  v-for="hit in trendChart.hitAreas"
                  :key="hit.key"
                  :x="hit.x"
                  :y="trendChart.marginTop"
                  :width="hit.width"
                  :height="trendChart.plotHeight"
                  fill="transparent"
                ><title>{{ hit.tooltip }}</title></rect>
              </svg>
              <div class="trend__legend">
                <span class="trend__legend-item trend__legend-item--subscribed">Подписки</span>
                <span class="trend__legend-item trend__legend-item--sent">Отправки</span>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-card__head">
                <h3 class="chart-card__title">Топ товаров по подпискам</h3>
                <select class="site-select chart-card__select" v-model="topProductsCountry" aria-label="Страна">
                  <option v-for="code in countryOptions" :key="code" :value="code">{{ countryName(code) }}</option>
                </select>
              </div>
              <div class="product-bars">
                <div v-for="bar in topProductsBars" :key="bar.sku" class="product-bar">
                  <div class="product-bar__track">
                    <div class="product-bar__fill" :style="{ width: bar.widthPct + '%', background: bar.color }"></div>
                  </div>
                  <div class="product-bar__label"><span>{{ bar.sku }}</span><strong>{{ bar.count }}</strong></div>
                </div>
                <div v-if="!topProductsBars.length" class="table__empty">Нет данных</div>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2>Топ SKU по подпискам</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>SKU</th><th>Страна</th><th>Подписок</th></tr></thead>
              <tbody>
                <tr v-for="row in data.topSkus" :key="row.country + row.sku">
                  <td>{{ row.sku }}</td>
                  <td>{{ row.country }}</td>
                  <td>{{ row.total_count }}</td>
                </tr>
                <tr v-if="!data.topSkus.length"><td colspan="3" class="table__empty">Нет данных</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2>Время ожидания по SKU</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>SKU</th><th>Страна</th><th>Отправок</th><th>Среднее ожидание</th></tr></thead>
              <tbody>
                <tr v-for="row in data.waitTimeBySku" :key="row.country + row.sku">
                  <td>{{ row.sku }}</td>
                  <td>{{ row.country }}</td>
                  <td>{{ row.sentCount }}</td>
                  <td>{{ formatDuration(row.avgWaitMs) }}</td>
                </tr>
                <tr v-if="!data.waitTimeBySku.length"><td colspan="4" class="table__empty">Нет данных</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2>Ошибки по странам</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Страна</th><th>Ошибок</th></tr></thead>
              <tbody>
                <tr v-for="row in data.errorsByCountry" :key="row.country">
                  <td>{{ row.country }}</td>
                  <td>{{ row.error_count }}</td>
                </tr>
                <tr v-if="!data.errorsByCountry.length"><td colspan="2" class="table__empty">Нет ошибок</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2>Требует внимания</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Email</th><th>SKU</th><th>Страна</th><th>Попыток письма</th><th>Ошибка письма</th><th>Bitrix</th><th>Обновлено</th></tr></thead>
              <tbody>
                <tr v-for="row in data.subscriptionsNeedingAttention" :key="row.id">
                  <td>{{ row.email }}</td>
                  <td>{{ row.sku }}</td>
                  <td>{{ row.country }}</td>
                  <td>{{ row.notification_attempts }}</td>
                  <td>{{ row.notification_last_error || '—' }}</td>
                  <td>{{ managerStatusLabels[row.manager_notification_status] || row.manager_notification_status }}</td>
                  <td>{{ formatDate(row.updatedAt) }}</td>
                </tr>
                <tr v-if="!data.subscriptionsNeedingAttention.length"><td colspan="7" class="table__empty">Проблем не найдено</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2>Проблемные email</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Email</th><th>Ошибок</th></tr></thead>
              <tbody>
                <tr v-for="row in data.problemEmails" :key="row.email">
                  <td>{{ row.email }}</td>
                  <td>{{ row.error_count }}</td>
                </tr>
                <tr v-if="!data.problemEmails.length"><td colspan="2" class="table__empty">Нет данных</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2>Уведомления менеджеру (Bitrix)</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Статус</th><th>Количество</th></tr></thead>
              <tbody>
                <tr v-for="row in data.managerNotificationStats" :key="row.manager_notification_status">
                  <td>{{ managerStatusLabels[row.manager_notification_status] || row.manager_notification_status }}</td>
                  <td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2>Последние запуски проверки наличия</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Запуск</th><th>Проверено</th><th>Отправлено</th><th>Ошибок</th></tr></thead>
              <tbody>
                <tr v-for="run in data.recentCronRuns" :key="run.id">
                  <td>{{ formatDate(run.started_at) }}</td>
                  <td>{{ run.subs_checked }}</td>
                  <td>{{ run.sent_count }}</td>
                  <td>{{ run.errors_count }}</td>
                </tr>
                <tr v-if="!data.recentCronRuns.length"><td colspan="4" class="table__empty">Проверки ещё не выполнялись</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>
  `,
}).mount("#app");
