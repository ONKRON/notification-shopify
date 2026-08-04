function renderManagerDashboard() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ONKRON — подписки на товары</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #15202b;
      --muted: #697582;
      --line: #dfe5e8;
      --surface: #ffffff;
      --canvas: #f3f6f7;
      --accent: #19c8c2;
      --accent-dark: #0b837f;
      --shadow: 0 12px 32px rgba(24, 48, 58, .09);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--canvas);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button, input { font: inherit; }
    .header {
      padding: 28px clamp(20px, 5vw, 72px);
      background: #101b22;
      color: white;
    }
    .header__row {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
    }
    .brand { color: var(--accent); font-weight: 850; letter-spacing: .12em; }
    h1 { margin: 8px 0 0; font-size: clamp(26px, 4vw, 42px); line-height: 1.1; }
    .updated { color: #aebbc2; font-size: 13px; }
    .main { max-width: 1440px; margin: 0 auto; padding: 28px clamp(20px, 5vw, 72px) 64px; }
    .toolbar {
      position: sticky;
      top: 12px;
      z-index: 5;
      display: grid;
      grid-template-columns: minmax(240px, 1fr) auto;
      gap: 18px;
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, .94);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
    }
    .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
    .country {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 11px;
      border: 1px solid var(--line);
      border-radius: 999px;
      cursor: pointer;
      user-select: none;
    }
    .country:has(input:checked) { border-color: var(--accent); background: #e9fbfa; }
    .country input { accent-color: var(--accent-dark); }
    .actions { display: flex; gap: 10px; }
    .search {
      width: min(280px, 32vw);
      padding: 10px 13px;
      border: 1px solid var(--line);
      border-radius: 11px;
      outline: none;
    }
    .search:focus { border-color: var(--accent-dark); box-shadow: 0 0 0 3px rgba(25, 200, 194, .15); }
    .button {
      border: 0;
      border-radius: 11px;
      padding: 10px 14px;
      color: white;
      background: var(--accent-dark);
      cursor: pointer;
    }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 22px 0 30px; }
    .metric { padding: 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; }
    .metric__value { display: block; font-size: 28px; font-weight: 800; }
    .metric__label { color: var(--muted); font-size: 13px; }
    .section { margin-top: 34px; }
    .section__head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
    .section h2 { margin: 0; font-size: 24px; }
    .section__count { color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(285px, 1fr)); gap: 18px; }
    .card {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 410px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--surface);
      box-shadow: 0 8px 24px rgba(24, 48, 58, .06);
    }
    .card__image {
      position: relative;
      display: grid;
      place-items: center;
      height: 210px;
      background: linear-gradient(145deg, #eef4f5, #dfe8ea);
      color: #809098;
      font-size: 42px;
      font-weight: 800;
    }
    .card__image img { width: 100%; height: 100%; object-fit: contain; background: white; }
    .badge {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 7px 10px;
      border-radius: 999px;
      background: #101b22;
      color: white;
      font-size: 12px;
      font-weight: 700;
    }
    .card__body { display: flex; flex: 1; flex-direction: column; padding: 18px; }
    .card__title { margin: 0 0 6px; font-size: 18px; line-height: 1.3; }
    .card__meta { color: var(--muted); font-size: 12px; }
    .sku-list { display: grid; gap: 7px; margin-top: 16px; }
    .sku { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; border-radius: 9px; background: #f5f8f8; }
    .sku strong { color: var(--accent-dark); }
    .card__link { margin-top: auto; padding-top: 16px; color: var(--accent-dark); font-weight: 700; text-decoration: none; }
    .catalog-warning { margin-top: auto; padding-top: 16px; color: #9a6510; font-size: 12px; }
    .state { padding: 72px 20px; text-align: center; color: var(--muted); }
    @media (max-width: 760px) {
      .header__row { align-items: flex-start; flex-direction: column; }
      .toolbar { position: static; grid-template-columns: 1fr; }
      .actions { display: grid; grid-template-columns: 1fr auto; }
      .search { width: 100%; }
      .summary { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header__row">
      <div><div class="brand">ONKRON</div><h1>Подписки на товары</h1></div>
      <div class="updated" id="updated">Загрузка данных…</div>
    </div>
  </header>
  <main class="main">
    <div class="toolbar">
      <div class="filters" id="filters"></div>
      <div class="actions">
        <input class="search" id="search" type="search" placeholder="Название или SKU">
        <button class="button" id="refresh" type="button">Обновить</button>
      </div>
    </div>
    <div class="summary" id="summary"></div>
    <div id="content"><div class="state">Загружаем подписки и каталог Shopify…</div></div>
  </main>
  <script>
    let dashboard = null;
    let selectedCountries = new Set();
    let searchTerm = "";

    const make = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };

    function renderFilters() {
      const filters = document.getElementById("filters");
      filters.replaceChildren();
      for (const country of dashboard.countries) {
        const label = make("label", "country");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = selectedCountries.has(country.code);
        input.addEventListener("change", () => {
          if (input.checked) selectedCountries.add(country.code);
          else selectedCountries.delete(country.code);
          render();
        });
        label.append(input, document.createTextNode(country.code + " · " + country.totalSubscriptions));
        filters.append(label);
      }
    }

    function visibleCountries() {
      const query = searchTerm.trim().toLowerCase();
      return dashboard.countries
        .filter((country) => selectedCountries.has(country.code))
        .map((country) => ({
          ...country,
          products: country.products.filter((product) =>
            !query || product.title.toLowerCase().includes(query) ||
            product.skus.some((item) => String(item.sku).toLowerCase().includes(query))
          ),
        }))
        .filter((country) => country.products.length > 0);
    }

    function renderSummary(countries) {
      const products = countries.reduce((sum, country) => sum + country.products.length, 0);
      const subscriptions = countries.reduce(
        (sum, country) => sum + country.products.reduce((count, product) => count + product.totalSubscriptions, 0),
        0,
      );
      const values = [
        [subscriptions, "Активных подписок"],
        [products, "Товаров"],
        [countries.length, "Стран"],
      ];
      const summary = document.getElementById("summary");
      summary.replaceChildren(...values.map(([value, label]) => {
        const metric = make("div", "metric");
        metric.append(make("span", "metric__value", String(value)), make("span", "metric__label", label));
        return metric;
      }));
    }

    function renderCard(product) {
      const card = make("article", "card");
      const imageBox = make("div", "card__image", product.imageUrl ? "" : product.country);
      if (product.imageUrl) {
        const image = document.createElement("img");
        image.src = product.imageUrl;
        image.alt = product.title;
        image.loading = "lazy";
        imageBox.append(image);
      }
      imageBox.append(make("span", "badge", product.totalSubscriptions + " подписок"));

      const body = make("div", "card__body");
      body.append(make("h3", "card__title", product.title));
      body.append(make("div", "card__meta", "Product ID: " + product.productId));
      const skuList = make("div", "sku-list");
      for (const item of product.skus) {
        const row = make("div", "sku");
        row.append(make("span", "", item.sku || "Без SKU"), make("strong", "", String(item.subscriptions)));
        skuList.append(row);
      }
      body.append(skuList);
      if (product.shopifyUrl) {
        const link = make("a", "card__link", "Открыть в Shopify →");
        link.href = product.shopifyUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        body.append(link);
      } else {
        body.append(make("div", "catalog-warning", "Карточка Shopify временно недоступна"));
      }
      card.append(imageBox, body);
      return card;
    }

    function render() {
      if (!dashboard) return;
      renderFilters();
      const countries = visibleCountries();
      renderSummary(countries);
      const content = document.getElementById("content");
      content.replaceChildren();
      if (countries.length === 0) {
        content.append(make("div", "state", "По выбранным фильтрам подписок нет."));
        return;
      }
      for (const country of countries) {
        const section = make("section", "section");
        const head = make("div", "section__head");
        head.append(make("h2", "", country.code), make("span", "section__count", country.totalSubscriptions + " активных подписок"));
        const grid = make("div", "grid");
        grid.append(...country.products.map(renderCard));
        section.append(head, grid);
        content.append(section);
      }
    }

    async function loadDashboard(forceRefresh = false) {
      document.getElementById("refresh").disabled = true;
      try {
        const response = await fetch("/api/manager/subscriptions" + (forceRefresh ? "?refresh=1" : ""), { cache: "no-store" });
        if (!response.ok) throw new Error("Не удалось загрузить данные: " + response.status);
        dashboard = await response.json();
        selectedCountries = new Set(dashboard.countries.map((country) => country.code));
        document.getElementById("updated").textContent = "Обновлено " + new Date(dashboard.generatedAt).toLocaleString("ru-RU");
        render();
      } catch (error) {
        document.getElementById("content").innerHTML = '<div class="state"></div>';
        document.querySelector("#content .state").textContent = error.message;
      } finally {
        document.getElementById("refresh").disabled = false;
      }
    }

    document.getElementById("search").addEventListener("input", (event) => {
      searchTerm = event.target.value;
      render();
    });
    document.getElementById("refresh").addEventListener("click", () => loadDashboard(true));
    loadDashboard();
  </script>
</body>
</html>`;
}

module.exports = { renderManagerDashboard };
