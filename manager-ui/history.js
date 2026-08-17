const { createApp, ref, computed, onMounted, onBeforeUnmount, watch } = Vue;

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
  { key: "nickname", label: "Подписчик" },
  { key: "sku", label: "Товар" },
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
    const copiedEmail = ref("");
    const toast = ref("");
    let toastTimer = null;

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
        const response = await fetch(`/manager/history/data?${buildQuery()}`, {
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

    const hasActiveFilters = computed(() =>
      Boolean(
        searchTerm.value.trim() ||
          selectedCountries.value.length ||
          statusFilter.value ||
          dateFrom.value ||
          dateTo.value,
      ),
    );

    function resetFilters() {
      searchTerm.value = "";
      selectedCountries.value = [];
      statusFilter.value = "";
      dateFrom.value = "";
      dateTo.value = "";
      resetPageAndLoad();
    }

    async function writeClipboard(value) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
      }
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) throw new Error("Copy failed");
    }

    async function copyEmail(email) {
      try {
        await writeClipboard(email);
        copiedEmail.value = email;
        toast.value = `Email ${email} скопирован`;
      } catch {
        toast.value = "Не удалось скопировать email";
      }
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.value = "";
        copiedEmail.value = "";
      }, 2200);
    }

    watch(searchTerm, () => {
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(resetPageAndLoad, 350);
    });
    watch(statusFilter, resetPageAndLoad);
    watch([dateFrom, dateTo], resetPageAndLoad);

    const csvExportUrl = computed(() => `/manager/history/export.csv?${buildQuery()}`);

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
    onBeforeUnmount(() => {
      window.clearTimeout(toastTimer);
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
      copiedEmail,
      copyEmail,
      toast,
      hasActiveFilters,
      resetFilters,
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
          <button v-if="hasActiveFilters" class="pager__button" type="button" @click="resetFilters">Сбросить фильтры</button>
        </div>
      </div>

      <div class="toolbar-secondary" v-if="result">
        <label class="field">
          <span class="field__label">Статус</span>
          <select v-model="statusFilter" class="site-select" aria-label="Статус">
            <option value="">Любой</option>
            <option value="sent">Отправлено</option>
            <option value="pending">Ожидает</option>
            <option value="error">Ошибка</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Дата с</span>
          <input v-model="dateFrom" class="date-input" type="date" aria-label="Дата от">
        </label>
        <label class="field">
          <span class="field__label">Дата по</span>
          <input v-model="dateTo" class="date-input" type="date" aria-label="Дата до">
        </label>
        <a class="button field__export" :href="csvExportUrl">Экспорт CSV</a>
      </div>

      <div v-if="loading" class="app-loading">Загружаем историю подписок…</div>
      <div v-else-if="error" class="state state--error">{{ error }}</div>
      <template v-else-if="result">
        <div class="summary">
          <div class="metric"><strong>{{ result.total }}</strong><span>Найдено подписок</span></div>
          <div class="metric"><strong>{{ result.page }}</strong><span>Страница из {{ result.totalPages }}</span></div>
          <div class="metric"><strong>{{ result.countries.length }}</strong><span>Стран доступно для фильтра</span></div>
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
                  <th>Статус</th>
                  <th>Попыток</th>
                  <th>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in result.items" :key="row.id">
                  <td class="cell-nowrap">{{ formatDate(row.createdAt) }}</td>
                  <td class="cell-wrap">
                    <div class="subscriber-cell">
                      <span class="subscriber-cell__name">{{ row.nickname || 'Без имени' }}</span>
                      <button
                        class="subscriber-cell__email"
                        :class="{ 'subscriber-cell__email--copied': copiedEmail === row.email }"
                        type="button"
                        :title="'Скопировать ' + row.email"
                        @click="copyEmail(row.email)"
                      >{{ copiedEmail === row.email ? 'Скопировано ✓' : row.email }}</button>
                    </div>
                  </td>
                  <td class="cell-wrap">
                    <div class="product-cell">
                      <div class="product-cell__image">
                        <img v-if="row.productImageUrl" :src="row.productImageUrl" :alt="row.productTitle" loading="lazy">
                        <span v-else class="product-cell__placeholder">{{ row.country }}</span>
                      </div>
                      <div class="product-cell__text">
                        <span class="product-cell__title">{{ row.productTitle }}</span>
                        <span class="product-cell__sku">{{ row.sku || 'Без SKU' }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="cell-nowrap">{{ row.country }}</td>
                  <td class="cell-nowrap"><span class="status-pill" :class="'status-pill--' + row.status">{{ STATUS_LABELS[row.status] || row.status }}</span></td>
                  <td class="cell-nowrap">{{ row.notificationAttempts }}</td>
                  <td class="cell-wrap cell-error" :title="row.notificationLastError || ''">{{ row.notificationLastError || '—' }}</td>
                </tr>
                <tr v-if="!result.items.length"><td colspan="7" class="table__empty">По выбранным фильтрам подписок нет.</td></tr>
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

    <transition name="toast">
      <div v-if="toast" class="toast" role="status" aria-live="polite">{{ toast }}</div>
    </transition>
  `,
}).mount("#app");
