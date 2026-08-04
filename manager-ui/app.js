const { createApp, computed, nextTick, onBeforeUnmount, onMounted, ref } = Vue;

createApp({
  setup() {
    const dashboard = ref(null);
    const selectedCountries = ref([]);
    const selectedSiteBySku = ref({});
    const searchTerm = ref("");
    const loading = ref(true);
    const refreshing = ref(false);
    const error = ref("");
    const details = ref(null);
    const detailsProduct = ref(null);
    const detailsLoading = ref(false);
    const detailsError = ref("");
    const copiedEmail = ref("");
    const toast = ref("");
    let toastTimer = null;

    const products = computed(() => {
      if (!dashboard.value) return [];
      const query = searchTerm.value.trim().toLowerCase();
      return dashboard.value.products
        .map((product) => {
          const sites = selectedCountries.value.length
            ? product.sites.filter((site) =>
                selectedCountries.value.includes(site.country),
              )
            : product.sites;
          if (!sites.length) return null;
          const savedCountry = selectedSiteBySku.value[product.sku];
          const representative =
            sites.find((site) => site.country === savedCountry) ||
            sites.find((site) => site.catalogStatus === "available") ||
            sites[0];
          return {
            ...product,
            sites,
            title:
              representative.title || product.title || `SKU ${product.sku}`,
            imageUrl: representative.imageUrl || product.imageUrl || null,
            totalSubscriptions: sites.reduce(
              (sum, site) => sum + site.subscriptions,
              0,
            ),
            selectedSiteCountry: representative.country,
          };
        })
        .filter(Boolean)
        .filter(
          (product) =>
            !query ||
            product.title.toLowerCase().includes(query) ||
            product.sku.toLowerCase().includes(query),
        );
    });

    const summary = computed(() => ({
      subscriptions: products.value.reduce(
        (sum, product) => sum + product.totalSubscriptions,
        0,
      ),
      products: products.value.length,
      countries: new Set(
        products.value.flatMap((product) =>
          product.sites.map((site) => site.country),
        ),
      ).size,
    }));

    const singleSelectedCountry = computed(() =>
      selectedCountries.value.length === 1 ? selectedCountries.value[0] : null,
    );
    const selectedCountriesLabel = computed(() =>
      selectedCountries.value.length
        ? selectedCountries.value.join(", ")
        : "все страны",
    );

    const selectedSite = (product) =>
      product.sites.find(
        (site) => site.country === product.selectedSiteCountry,
      ) || product.sites[0];

    function selectProductSite(product, event) {
      selectedSiteBySku.value = {
        ...selectedSiteBySku.value,
        [product.sku]: event.target.value,
      };
    }

    const pluralizeSubscriptions = (count) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return "подписка";
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
        return "подписки";
      return "подписок";
    };

    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("ru-RU") : "Дата неизвестна";

    async function loadDashboard(forceRefresh = false) {
      refreshing.value = forceRefresh;
      loading.value = !dashboard.value;
      error.value = "";
      try {
        const suffix = forceRefresh ? "?refresh=1" : "";
        const response = await fetch(`/api/manager/subscriptions${suffix}`, {
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(`Не удалось загрузить данные: ${response.status}`);
        dashboard.value = await response.json();
        const availableCountries = new Set(
          dashboard.value.countries.map((country) => country.code),
        );
        selectedCountries.value = selectedCountries.value.filter((country) =>
          availableCountries.has(country),
        );
      } catch (loadError) {
        error.value = loadError.message;
      } finally {
        loading.value = false;
        refreshing.value = false;
      }
    }

    function chooseCountry(country) {
      selectedCountries.value = selectedCountries.value.includes(country)
        ? selectedCountries.value.filter((selected) => selected !== country)
        : [...selectedCountries.value, country];
    }

    async function openDetails(product) {
      detailsProduct.value = product;
      details.value = null;
      detailsError.value = "";
      detailsLoading.value = true;
      document.body.classList.add("modal-open");
      await nextTick();
      try {
        const params = new URLSearchParams({ sku: product.sku });
        if (selectedCountries.value.length)
          params.set("countries", selectedCountries.value.join(","));
        const response = await fetch(
          `/api/manager/subscription-details?${params}`,
          { cache: "no-store" },
        );
        if (!response.ok)
          throw new Error(`Не удалось загрузить детали: ${response.status}`);
        details.value = await response.json();
      } catch (loadError) {
        detailsError.value = loadError.message;
      } finally {
        detailsLoading.value = false;
      }
    }

    function closeDetails() {
      detailsProduct.value = null;
      details.value = null;
      copiedEmail.value = "";
      document.body.classList.remove("modal-open");
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

    function handleKeydown(event) {
      if (event.key === "Escape" && detailsProduct.value) closeDetails();
    }

    onMounted(() => {
      window.addEventListener("keydown", handleKeydown);
      loadDashboard();
    });
    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKeydown);
      window.clearTimeout(toastTimer);
    });

    return {
      closeDetails,
      copiedEmail,
      copyEmail,
      chooseCountry,
      dashboard,
      details,
      detailsError,
      detailsLoading,
      detailsProduct,
      error,
      formatDate,
      loadDashboard,
      loading,
      openDetails,
      pluralizeSubscriptions,
      products,
      refreshing,
      searchTerm,
      selectedCountries,
      selectedCountriesLabel,
      selectProductSite,
      selectedSite,
      singleSelectedCountry,
      summary,
      toast,
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
          <div class="updated" v-if="dashboard">Обновлено {{ formatDate(dashboard.generatedAt) }}</div>
          <div class="updated" v-else>
            <span class="skeleton skeleton--updated" aria-hidden="true"></span>
            <span class="sr-only">Загрузка данных</span>
          </div>
        </div>
      </div>
      <div class="header__nav-bar">
        <nav class="header__nav" aria-label="Навигация панели">
          <span class="header__nav-label">Подписка на товары</span>
          <span class="header__scope">{{ selectedCountries.length ? selectedCountries.join(', ') : 'Все страны' }}</span>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="toolbar" v-if="dashboard">
        <div class="filters" aria-label="Фильтр по стране">
          <button
            class="country"
            :class="{ 'country--active': !selectedCountries.length }"
            type="button"
            @click="selectedCountries = []"
          >Все страны</button>
          <button
            v-for="country in dashboard.countries"
            :key="country.code"
            class="country"
            :class="{ 'country--active': selectedCountries.includes(country.code) }"
            type="button"
            :aria-pressed="selectedCountries.includes(country.code)"
            @click="chooseCountry(country.code)"
          >
            <span class="country__check" aria-hidden="true">{{ selectedCountries.includes(country.code) ? '✓' : '' }}</span>
            {{ country.code }} · {{ country.totalSubscriptions }}
          </button>
        </div>
        <div class="actions">
          <input id="dashboard-search" v-model="searchTerm" class="search" type="search" placeholder="Название или SKU" aria-label="Название или SKU">
          <button class="button" type="button" :disabled="refreshing" @click="loadDashboard(true)">
            {{ refreshing ? 'Обновляем…' : 'Обновить' }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="dashboard-skeleton" role="status" aria-live="polite">
        <span class="sr-only">Загружаем подписки и каталог Shopify</span>

        <div class="toolbar toolbar--skeleton" aria-hidden="true">
          <div class="filters">
            <span v-for="item in 8" :key="item" class="skeleton skeleton--chip"></span>
          </div>
          <div class="actions">
            <span class="skeleton skeleton--search"></span>
            <span class="skeleton skeleton--button"></span>
          </div>
        </div>

        <div class="summary" aria-hidden="true">
          <div v-for="item in 3" :key="item" class="metric metric--skeleton">
            <span class="skeleton skeleton--metric-value"></span>
            <span class="skeleton skeleton--metric-label"></span>
          </div>
        </div>

        <section class="section" aria-hidden="true">
          <div class="section__head section__head--skeleton">
            <span class="skeleton skeleton--heading"></span>
            <span class="skeleton skeleton--count"></span>
          </div>
          <div class="grid">
            <article v-for="item in 4" :key="item" class="card card--skeleton">
              <div class="card__image skeleton skeleton--image"></div>
              <div class="card__body">
                <div class="card__top">
                  <span class="skeleton skeleton--title"></span>
                  <span class="skeleton skeleton--title skeleton--title-short"></span>
                  <span class="skeleton skeleton--meta"></span>
                </div>
                <div class="card__bottom">
                  <span class="skeleton skeleton--sku"></span>
                  <span class="skeleton skeleton--select"></span>
                  <span class="skeleton skeleton--card-button"></span>
                  <span class="skeleton skeleton--details"></span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
      <div v-else-if="error" class="state state--error">{{ error }}</div>
      <template v-else-if="dashboard">
        <div class="summary">
          <div class="metric"><strong>{{ summary.subscriptions }}</strong><span>Активных подписок</span></div>
          <div class="metric"><strong>{{ summary.products }}</strong><span>Товаров</span></div>
          <div class="metric"><strong>{{ summary.countries }}</strong><span>Стран</span></div>
        </div>

        <section id="products" class="section">
          <div class="section__head">
            <h2>{{ selectedCountries.length ? selectedCountries.join(', ') : 'Все страны' }}</h2>
            <span>{{ products.length }} товаров</span>
          </div>
          <div v-if="products.length" class="grid">
            <article
              v-for="product in products"
              :key="product.sku"
              class="card"
              role="button"
              tabindex="0"
              :aria-label="'Открыть детали ' + product.sku"
              @click="openDetails(product)"
              @keydown.enter.prevent="openDetails(product)"
              @keydown.space.prevent="openDetails(product)"
            >
              <div class="card__image">
                <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.title" loading="lazy">
                <span v-else class="card__placeholder">{{ product.sites[0].country }}</span>
                <span class="badge">{{ product.totalSubscriptions }} {{ pluralizeSubscriptions(product.totalSubscriptions) }}</span>
              </div>
              <div class="card__body">
                <div class="card__top">
                  <h3 class="card__title">{{ product.title }}</h3>
                  <div v-if="!singleSelectedCountry" class="card__meta">
                    Доступен на сайтах: {{ product.sites.map(site => site.country).join(', ') }}
                  </div>
                </div>
                <div class="card__bottom">
                  <div class="sku">
                    <span>{{ product.sku || 'Без SKU' }}</span><strong>{{ product.totalSubscriptions }}</strong>
                  </div>
                  <div class="card__site">
                    <template v-if="singleSelectedCountry">
                      <a
                        v-if="product.sites[0].productUrl"
                        class="button"
                        :href="product.sites[0].productUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click.stop
                      >Открыть на сайте {{ product.sites[0].country }}</a>
                      <div v-else class="catalog-warning">Публичная ссылка недоступна</div>
                    </template>
                    <template v-else>
                      <select
                        :value="product.selectedSiteCountry"
                        class="site-select"
                        :aria-label="'Выбрать сайт для ' + product.sku"
                        @click.stop
                        @change.stop="selectProductSite(product, $event)"
                      >
                        <option v-for="site in product.sites" :key="site.country" :value="site.country">
                          {{ site.country }} · {{ site.subscriptions }} {{ pluralizeSubscriptions(site.subscriptions) }}
                        </option>
                      </select>
                      <a
                        v-if="selectedSite(product).productUrl"
                        class="button"
                        :href="selectedSite(product).productUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click.stop
                      >Открыть на сайте {{ selectedSite(product).country }}</a>
                      <div v-else class="catalog-warning">Публичная ссылка недоступна</div>
                    </template>
                  </div>
                  <button class="card__details" type="button" @click.stop="openDetails(product)">
                    Посмотреть подписчиков →
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="state">По выбранным фильтрам подписок нет.</div>
        </section>
      </template>
    </main>

    <div v-if="detailsProduct" class="modal" @click.self="closeDetails">
      <section class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div class="modal__head">
          <div>
            <h2 id="details-title" class="modal__title">{{ detailsProduct.title }}</h2>
            <div class="modal__subtitle">SKU {{ detailsProduct.sku }} · {{ selectedCountriesLabel }}</div>
          </div>
          <button class="modal__close" type="button" aria-label="Закрыть" @click="closeDetails">✕</button>
        </div>
        <div class="modal__content">
          <div v-if="detailsLoading" class="state">Загружаем подписчиков…</div>
          <div v-else-if="detailsError" class="state state--error">{{ detailsError }}</div>
          <div v-else-if="details && !details.sites.length" class="state">Активных подписчиков не найдено.</div>
          <template v-else-if="details">
            <section
              v-for="site in details.sites"
              :key="site.country"
              class="detail-site"
              :class="{ 'detail-site--single': singleSelectedCountry }"
            >
              <div class="detail-site__head">
                <strong v-if="!singleSelectedCountry">{{ site.country }} · {{ site.totalSubscriptions }} {{ pluralizeSubscriptions(site.totalSubscriptions) }}</strong>
                <span v-else>{{ site.totalSubscriptions }} {{ pluralizeSubscriptions(site.totalSubscriptions) }}</span>
                <a v-if="site.productUrl" class="detail-link" :href="site.productUrl" target="_blank" rel="noopener noreferrer">
                  Открыть товар на сайте →
                </a>
              </div>
              <div class="subscribers">
                <div v-for="subscriber in site.subscribers" :key="subscriber.id" class="subscriber">
                  <span class="subscriber__name">{{ subscriber.nickname || 'Без имени' }}</span>
                  <button
                    class="subscriber__email"
                    :class="{ 'subscriber__email--copied': copiedEmail === subscriber.email }"
                    type="button"
                    :title="'Скопировать ' + subscriber.email"
                    @click="copyEmail(subscriber.email)"
                  >
                    <span>{{ subscriber.email }}</span>
                    <small>{{ copiedEmail === subscriber.email ? 'Скопировано ✓' : 'Нажмите, чтобы скопировать' }}</small>
                  </button>
                  <span class="subscriber__date">{{ formatDate(subscriber.subscribedAt) }}</span>
                </div>
              </div>
            </section>
          </template>
        </div>
      </section>
    </div>

    <transition name="toast">
      <div v-if="toast" class="toast" role="status" aria-live="polite">{{ toast }}</div>
    </transition>
  `,
}).mount("#app");
