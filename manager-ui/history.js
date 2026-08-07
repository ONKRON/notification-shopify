const { createApp, ref, computed, onMounted, watch } = Vue;

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

const STATUS_LABELS = {
  sent: "Отправлено",
  pending: "Ожидает",
  error: "Ошибка",
};

const SORT_COLUMNS = [
  { key: "createdAt", label: "Дата" },
  { key: "nickname", label: "Никнейм" },
  { key: "email", label: "Email" },
  { key: "sku", label: "SKU" },
  { key: "country", label: "Страна" },
];

const PAGE_SIZE = 25;

createApp({
  setup() {
    const result = ref(null);
    const loading = ref(true);
    const refreshing = ref(false);
    const error = ref("");

    const searchTerm = ref("");
    const selectedCountries = ref([]);
    const statusFilter = ref("");
    const dateFrom = ref("");
    const dateTo = ref("");
    const sortBy = ref("createdAt");
    const sortDir = ref("desc");
    const page = ref(1);

    let searchDebounce = null;

    function buildQuery() {
      const params = new URLSearchParams();
      params.set("page", String(page.value));
      params.set("pageSize", String(PAGE_SIZE));
      params.set("sortBy", sortBy.value);
      params.set("sortDir", sortDir.value);
      if (searchTerm.value.trim()) params.set("search", searchTerm.value.trim());
      if (selectedCountries.value.length)
        params.set("country", selectedCountries.value.join(","));
      if (statusFilter.value) params.set("status", statusFilter.value);
      if (dateFrom.value) params.set("dateFrom", dateFrom.value);
      if (dateTo.value) params.set("dateTo", dateTo.value);
      return params;
    }

    async function loadHistory() {
      refreshing.value = Boolean(result.value);
      loading.value = !result.value;
      error.value = "";
      try {
        const response = await fetch(`/api/manager/history?${buildQuery()}`, {
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(`Не удалось загрузить историю: ${response.status}`);
        result.value = await response.json();
      } catch (loadError) {
        error.value = loadError.message;
      } finally {
        loading.value = false;
        refreshing.value = false;
      }
    }

    function resetPageAndLoad() {
      page.value = 1;
      loadHistory();
    }

    function chooseCountry(country) {
      selectedCountries.value = selectedCountries.value.includes(country)
        ? selectedCountries.value.filter((selected) => selected !== country)
        : [...selectedCountries.value, country];
      resetPageAndLoad();
    }

    function toggleSort(columnKey) {
      if (sortBy.value === columnKey) {
        sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
      } else {
        sortBy.value = columnKey;
        sortDir.value = columnKey === "createdAt" ? "desc" : "asc";
      }
      resetPageAndLoad();
    }

    function goToPage(nextPage) {
      if (!result.value) return;
      const clamped = Math.min(Math.max(1, nextPage), result.value.totalPages);
      if (clamped === page.value) return;
      page.value = clamped;
      loadHistory();
    }

    watch(searchTerm, () => {
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(resetPageAndLoad, 350);
    });
    watch(statusFilter, resetPageAndLoad);
    watch([dateFrom, dateTo], resetPageAndLoad);

    const csvExportUrl = computed(() => `/download-history-csv?${buildQuery()}`);

    const rangeLabel = computed(() => {
      if (!result.value || !result.value.total) return "";
      const from = (result.value.page - 1) * result.value.pageSize + 1;
      const to = Math.min(result.value.page * result.value.pageSize, result.value.total);
      return `${from}–${to} из ${result.value.total}`;
    });

    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("ru-RU") : "—";

    const sortIndicator = (columnKey) => {
      if (sortBy.value !== columnKey) return "";
      return sortDir.value === "asc" ? "▲" : "▼";
    };

    onMounted(() => {
      loadHistory();
    });

    return {
      result,
      loading,
      refreshing,
      error,
      searchTerm,
      selectedCountries,
      statusFilter,
      dateFrom,
      dateTo,
      sortBy,
      sortDir,
      page,
      chooseCountry,
      resetPageAndLoad,
      toggleSort,
      goToPage,
      loadHistory,
      csvExportUrl,
      rangeLabel,
      formatDate,
      sortIndicator,
      countryName,
      STATUS_LABELS,
      SORT_COLUMNS,
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
          <div class="updated" v-if="result">Обновлено {{ formatDate(result.generatedAt) }}</div>
          <button class="button" type="button" :disabled="refreshing" @click="loadHistory">
            {{ refreshing ? 'Обновляем…' : 'Обновить' }}
          </button>
        </div>
      </div>
      <div class="header__nav-bar">
        <nav class="header__nav" aria-label="Навигация панели">
          <a class="header__nav-link" href="/manager/subscriptions">Подписка на товары</a>
          <a class="header__nav-link" href="/manager/analytics">Аналитика</a>
          <a class="header__nav-link header__nav-link--active" href="/manager/history">История</a>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="toolbar" v-if="result">
        <div class="filters" aria-label="Фильтр по стране">
          <button
            class="country"
            :class="{ 'country--active': !selectedCountries.length }"
            type="button"
            @click="selectedCountries = []; resetPageAndLoad()"
          >Все страны</button>
          <button
            v-for="code in result.countries"
            :key="code"
            class="country"
            :class="{ 'country--active': selectedCountries.includes(code) }"
            type="button"
            :aria-pressed="selectedCountries.includes(code)"
            @click="chooseCountry(code)"
          >
            <span class="country__check" aria-hidden="true">{{ selectedCountries.includes(code) ? '✓' : '' }}</span>
            {{ countryName(code) }}
          </button>
        </div>
        <div class="actions">
          <input v-model="searchTerm" class="search" type="search" placeholder="SKU, ник или email" aria-label="Поиск по SKU, нику или email">
          <select v-model="statusFilter" class="site-select" aria-label="Статус">
            <option value="">Любой статус</option>
            <option value="sent">Отправлено</option>
            <option value="pending">Ожидает</option>
            <option value="error">Ошибка</option>
          </select>
          <input v-model="dateFrom" class="search" type="date" aria-label="Дата от">
          <input v-model="dateTo" class="search" type="date" aria-label="Дата до">
          <a class="button" :href="csvExportUrl">Экспорт CSV</a>
        </div>
      </div>

      <div v-if="loading" class="app-loading">Загружаем историю подписок…</div>
      <div v-else-if="error" class="state state--error">{{ error }}</div>
      <template v-else-if="result">
        <div class="summary">
          <div class="metric"><strong>{{ result.total }}</strong><span>Найдено подписок</span></div>
          <div class="metric"><strong>{{ result.page }}</strong><span>Страница из {{ result.totalPages }}</span></div>
          <div class="metric"><strong>{{ result.countries.length }}</strong><span>Стран в выборке</span></div>
        </div>

        <section class="section">
          <div class="section__head">
            <h2>История подписок</h2>
            <span>{{ rangeLabel }}</span>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th v-for="column in SORT_COLUMNS" :key="column.key" class="is-sortable" @click="toggleSort(column.key)">
                    {{ column.label }} {{ sortIndicator(column.key) }}
                  </th>
                  <th>Товар</th>
                  <th>Статус</th>
                  <th>Попыток</th>
                  <th>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in result.items" :key="row.id">
                  <td>{{ formatDate(row.createdAt) }}</td>
                  <td>{{ row.nickname || 'Без имени' }}</td>
                  <td>{{ row.email }}</td>
                  <td>{{ row.sku || 'Без SKU' }}</td>
                  <td>{{ row.country }}</td>
                  <td>{{ row.productTitle }}</td>
                  <td><span class="status-pill" :class="'status-pill--' + row.status">{{ STATUS_LABELS[row.status] || row.status }}</span></td>
                  <td>{{ row.notificationAttempts }}</td>
                  <td :title="row.notificationLastError || ''">{{ row.notificationLastError ? (row.notificationLastError.length > 40 ? row.notificationLastError.slice(0, 40) + '…' : row.notificationLastError) : '—' }}</td>
                </tr>
                <tr v-if="!result.items.length"><td colspan="9" class="table__empty">По выбранным фильтрам подписок нет.</td></tr>
              </tbody>
            </table>
          </div>
          <div class="pager" v-if="result.totalPages > 1">
            <button class="pager__button" type="button" :disabled="page <= 1" @click="goToPage(page - 1)">← Назад</button>
            <span>Стр. {{ result.page }} из {{ result.totalPages }}</span>
            <button class="pager__button" type="button" :disabled="page >= result.totalPages" @click="goToPage(page + 1)">Далее →</button>
          </div>
        </section>
      </template>
    </main>
  `,
}).mount("#app");
