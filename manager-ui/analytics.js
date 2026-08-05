const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const data = ref(null);
    const loading = ref(true);
    const error = ref("");

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
      } catch (loadError) {
        error.value = loadError.message;
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      loadAnalytics();
    });

    return {
      data,
      loading,
      error,
      formatDate,
      formatDuration,
      managerStatusLabels,
      loadAnalytics,
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
        </nav>
      </div>
    </header>

    <main class="main">
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
