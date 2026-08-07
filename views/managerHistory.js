function renderManagerHistory() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ONKRON — История подписок</title>
  <link rel="icon" type="image/png" href="https://cdn.shopify.com/s/files/1/2223/8189/files/favicon_landing.png">
  <link rel="stylesheet" href="/manager/assets/styles.css">
</head>
<body>
  <div id="app"><div class="app-loading">Загружаем историю подписок…</div></div>
  <script src="/manager/vue.js"></script>
  <script src="/manager/assets/history.js"></script>
</body>
</html>`;
}

module.exports = { renderManagerHistory };
