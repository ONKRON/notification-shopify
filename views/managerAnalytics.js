function renderManagerAnalytics() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ONKRON — Аналитика</title>
  <link rel="icon" type="image/png" href="https://cdn.shopify.com/s/files/1/2223/8189/files/favicon_landing.png">
  <link rel="stylesheet" href="/manager/assets/styles.css">
</head>
<body>
  <div id="app"><div class="app-loading">Загружаем аналитику…</div></div>
  <script src="/manager/vue.js"></script>
  <script src="/manager/assets/analytics.js"></script>
</body>
</html>`;
}

module.exports = { renderManagerAnalytics };
