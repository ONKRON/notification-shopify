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
      --surface: #fff;
      --canvas: #f3f6f7;
      --accent: #19c8c2;
      --accent-dark: #0b837f;
      --danger: #9a6510;
      --shadow: 0 12px 32px rgba(24, 48, 58, .09);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--canvas);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body.modal-open { overflow: hidden; }
    button, input, select { font: inherit; }
    .header { padding: 28px clamp(20px, 5vw, 72px); background: #101b22; color: #fff; }
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
      max-width: 100%;
      padding: 8px 11px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      color: var(--ink);
      cursor: pointer;
      user-select: none;
    }
    .country--active, .country:has(input:checked) { border-color: var(--accent); background: #e9fbfa; }
    .country input { accent-color: var(--accent-dark); }
    .actions { display: flex; gap: 10px; min-width: 0; }
    .search, .site-select {
      min-width: 0;
      padding: 10px 13px;
      border: 1px solid var(--line);
      border-radius: 11px;
      background: #fff;
      outline: none;
    }
    .search { width: min(280px, 32vw); }
    .search:focus, .site-select:focus { border-color: var(--accent-dark); box-shadow: 0 0 0 3px rgba(25, 200, 194, .15); }
    .button {
      border: 0;
      border-radius: 11px;
      padding: 10px 14px;
      color: #fff;
      background: var(--accent-dark);
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }
    .button:disabled, .button--disabled { opacity: .45; pointer-events: none; }
    .button--ghost { border: 1px solid var(--line); background: #fff; color: var(--ink); }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 22px 0 30px; }
    .metric { min-width: 0; padding: 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; }
    .metric__value { display: block; font-size: 28px; font-weight: 800; overflow-wrap: anywhere; }
    .metric__label { color: var(--muted); font-size: 13px; }
    .section { margin-top: 34px; }
    .section__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; margin-bottom: 14px; }
    .section h2 { margin: 0; font-size: 24px; }
    .section__count { color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 18px; align-items: stretch; }
    .card {
      overflow: hidden;
      display: flex;
      min-width: 0;
      flex-direction: column;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--surface);
      box-shadow: 0 8px 24px rgba(24, 48, 58, .06);
      cursor: pointer;
      transition: transform .16s ease, box-shadow .16s ease;
    }
    .card:hover, .card:focus-visible { transform: translateY(-2px); box-shadow: var(--shadow); outline: none; }
    .card__image {
      position: relative;
      display: grid;
      flex: 0 0 220px;
      place-items: center;
      min-width: 0;
      overflow: hidden;
      background: linear-gradient(145deg, #eef4f5, #dfe8ea);
      color: #809098;
      font-size: 42px;
      font-weight: 800;
    }
    .card__image img { display: block; width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .badge {
      position: absolute;
      top: 12px;
      right: 12px;
      max-width: calc(100% - 24px);
      padding: 7px 10px;
      border-radius: 999px;
      background: #101b22;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .card__body { display: flex; flex: 1; min-width: 0; flex-direction: column; padding: 18px; }
    .card__title { margin: 0 0 8px; font-size: 18px; line-height: 1.35; overflow-wrap: anywhere; }
    .card__meta { color: var(--muted); font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
    .sku-list, .country-breakdown { display: grid; gap: 7px; margin-top: 14px; }
    .sku, .country-row {
      display: flex;
      min-width: 0;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      border-radius: 9px;
      background: #f5f8f8;
    }
    .sku span, .country-row span { min-width: 0; overflow-wrap: anywhere; }
    .sku strong, .country-row strong { flex: 0 0 auto; color: var(--accent-dark); }
    .card__site { display: grid; gap: 9px; margin-top: 16px; }
    .site-select { width: 100%; text-overflow: ellipsis; }
    .card__details { margin-top: 10px; color: var(--accent-dark); font-weight: 700; font-size: 13px; }
    .catalog-warning { margin-top: 16px; color: var(--danger); font-size: 12px; overflow-wrap: anywhere; }
    .state { padding: 72px 20px; text-align: center; color: var(--muted); }
    .modal {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(9, 18, 24, .68);
    }
    .modal[hidden] { display: none; }
    .modal__panel {
      width: min(920px, 100%);
      max-height: min(820px, calc(100vh - 40px));
      overflow: auto;
      border-radius: 20px;
      background: #fff;
      box-shadow: 0 24px 80px rgba(0, 0, 0, .28);
    }
    .modal__head {
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 22px;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, .96);
      backdrop-filter: blur(10px);
    }
    .modal__title { margin: 0; font-size: 23px; overflow-wrap: anywhere; }
    .modal__subtitle { margin-top: 5px; color: var(--muted); overflow-wrap: anywhere; }
    .modal__close { flex: 0 0 auto; border: 0; border-radius: 50%; width: 38px; height: 38px; background: #eef3f4; cursor: pointer; }
    .modal__content { display: grid; gap: 18px; padding: 22px; }
    .detail-site { min-width: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 15px; }
    .detail-site__head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 16px; background: #f4f8f8; }
    .detail-site__head strong { overflow-wrap: anywhere; }
    .detail-link { color: var(--accent-dark); font-weight: 700; text-decoration: none; }
    .subscribers { display: grid; }
    .subscriber {
      display: grid;
      grid-template-columns: minmax(120px, .8fr) minmax(180px, 1.2fr) auto;
      gap: 12px;
      padding: 13px 16px;
      border-top: 1px solid var(--line);
      align-items: center;
    }
    .subscriber span { min-width: 0; overflow-wrap: anywhere; }
    .subscriber__date { color: var(--muted); font-size: 12px; text-align: right; }
    @media (max-width: 760px) {
      .header__row { align-items: flex-start; flex-direction: column; }
      .toolbar { position: static; grid-template-columns: 1fr; }
      .actions { display: grid; grid-template-columns: 1fr auto; }
      .search { width: 100%; }
      .summary { grid-template-columns: 1fr; }
      .subscriber { grid-template-columns: 1fr; gap: 4px; }
      .subscriber__date { text-align: left; }
      .modal { padding: 8px; }
      .modal__panel { max-height: calc(100vh - 16px); border-radius: 15px; }
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
  <div class="modal" id="details-modal" hidden>
    <section class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="details-title">
      <div class="modal__head">
        <div><h2 class="modal__title" id="details-title">Детали подписок</h2><div class="modal__subtitle" id="details-subtitle"></div></div>
        <button class="modal__close" id="details-close" type="button" aria-label="Закрыть">✕</button>
      </div>
      <div class="modal__content" id="details-content"></div>
    </section>
  </div>
  <script>
    let dashboard = null;
    let selectedCountry = null;
    let searchTerm = "";

    const make = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };

    function productView(product) {
      const sites = selectedCountry
        ? product.sites.filter((site) => site.country === selectedCountry)
        : product.sites;
      if (sites.length === 0) return null;
      const representative = sites.find((site) => site.catalogStatus === "available") || sites[0];
      return {
        ...product,
        sites,
        title: representative.title || product.title || ("SKU " + product.sku),
        imageUrl: representative.imageUrl || product.imageUrl || null,
        totalSubscriptions: sites.reduce((sum, site) => sum + site.subscriptions, 0),
      };
    }

    function visibleProducts() {
      const query = searchTerm.trim().toLowerCase();
      return dashboard.products
        .map(productView)
        .filter(Boolean)
        .filter((product) =>
          !query || product.title.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query)
        );
    }

    function renderFilters() {
      const filters = document.getElementById("filters");
      filters.replaceChildren();
      const allButton = make("button", "country" + (selectedCountry ? "" : " country--active"), "Все страны");
      allButton.type = "button";
      allButton.addEventListener("click", () => {
        selectedCountry = null;
        render();
      });
      filters.append(allButton);

      for (const country of dashboard.countries) {
        const label = make("label", "country");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = selectedCountry === country.code;
        input.addEventListener("change", () => {
          selectedCountry = input.checked ? country.code : null;
          render();
        });
        label.append(input, document.createTextNode(country.code + " · " + country.totalSubscriptions));
        filters.append(label);
      }
    }

    function renderSummary(products) {
      const subscriptions = products.reduce((sum, product) => sum + product.totalSubscriptions, 0);
      const countries = new Set(products.flatMap((product) => product.sites.map((site) => site.country)));
      const values = [
        [subscriptions, "Активных подписок"],
        [products.length, "Товаров"],
        [countries.size, "Стран"],
      ];
      const summary = document.getElementById("summary");
      summary.replaceChildren(...values.map(([value, label]) => {
        const metric = make("div", "metric");
        metric.append(make("span", "metric__value", String(value)), make("span", "metric__label", label));
        return metric;
      }));
    }

    function updateProductLink(select, link) {
      const option = select.options[select.selectedIndex];
      const url = option ? option.dataset.url : "";
      link.href = url || "#";
      link.classList.toggle("button--disabled", !url);
      link.textContent = url ? "Открыть на сайте " + option.dataset.country : "Ссылка недоступна";
    }

    function appendSiteAction(body, product) {
      const siteBox = make("div", "card__site");
      if (selectedCountry) {
        const site = product.sites[0];
        if (site.productUrl) {
          const link = make("a", "button", "Открыть на сайте " + site.country);
          link.href = site.productUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          siteBox.append(link);
        } else {
          siteBox.append(make("div", "catalog-warning", "Публичная ссылка для " + site.country + " недоступна"));
        }
      } else {
        const select = make("select", "site-select");
        select.setAttribute("aria-label", "Выбрать сайт для " + product.sku);
        for (const site of product.sites) {
          const option = document.createElement("option");
          option.value = site.country + ":" + site.productId;
          option.textContent = site.country + " · " + site.subscriptions + " подписок";
          option.dataset.country = site.country;
          option.dataset.url = site.productUrl || "";
          select.append(option);
        }
        const link = make("a", "button", "Открыть на сайте");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        select.addEventListener("change", () => updateProductLink(select, link));
        updateProductLink(select, link);
        siteBox.append(select, link);
      }
      body.append(siteBox);
    }

    function renderCard(product) {
      const card = make("article", "card");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Открыть детали " + product.sku);
      const imageBox = make("div", "card__image", product.imageUrl ? "" : product.sites[0].country);
      if (product.imageUrl) {
        const image = document.createElement("img");
        image.src = product.imageUrl;
        image.alt = product.title;
        image.loading = "lazy";
        imageBox.append(image);
      }
      imageBox.append(make("span", "badge", product.totalSubscriptions + " подписок"));

      const body = make("div", "card__body");
      body.append(make("h3", "card__title", product.title || ("SKU " + product.sku)));
      if (selectedCountry) {
        body.append(make("div", "card__meta", "Product ID: " + product.sites[0].productId));
      } else {
        body.append(make("div", "card__meta", "Доступен на сайтах: " + product.sites.map((site) => site.country).join(", ")));
      }
      const skuList = make("div", "sku-list");
      const skuRow = make("div", "sku");
      skuRow.append(make("span", "", product.sku || "Без SKU"), make("strong", "", String(product.totalSubscriptions)));
      skuList.append(skuRow);
      body.append(skuList);

      if (!selectedCountry && product.sites.length > 1) {
        const breakdown = make("div", "country-breakdown");
        for (const site of product.sites) {
          const row = make("div", "country-row");
          row.append(make("span", "", site.country), make("strong", "", String(site.subscriptions)));
          breakdown.append(row);
        }
        body.append(breakdown);
      }

      appendSiteAction(body, product);
      body.append(make("div", "card__details", "Нажмите на карточку для подробностей →"));
      card.append(imageBox, body);
      card.addEventListener("click", (event) => {
        if (event.target.closest("a, select, option, button")) return;
        openDetails(product);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails(product);
        }
      });
      return card;
    }

    function render() {
      if (!dashboard) return;
      renderFilters();
      const products = visibleProducts();
      renderSummary(products);
      const content = document.getElementById("content");
      content.replaceChildren();
      if (products.length === 0) {
        content.append(make("div", "state", "По выбранным фильтрам подписок нет."));
        return;
      }
      const section = make("section", "section");
      const head = make("div", "section__head");
      const heading = selectedCountry || "Все страны";
      head.append(make("h2", "", heading), make("span", "section__count", products.length + " товаров"));
      const grid = make("div", "grid");
      grid.append(...products.map(renderCard));
      section.append(head, grid);
      content.append(section);
    }

    function closeDetails() {
      document.getElementById("details-modal").hidden = true;
      document.body.classList.remove("modal-open");
    }

    function renderSubscriber(subscriber) {
      const row = make("div", "subscriber");
      row.append(
        make("span", "", subscriber.nickname || "Без имени"),
        make("span", "", subscriber.email),
        make("span", "subscriber__date", subscriber.subscribedAt ? new Date(subscriber.subscribedAt).toLocaleString("ru-RU") : "Дата неизвестна"),
      );
      return row;
    }

    async function openDetails(product) {
      const modal = document.getElementById("details-modal");
      const content = document.getElementById("details-content");
      document.getElementById("details-title").textContent = product.title || ("SKU " + product.sku);
      document.getElementById("details-subtitle").textContent = "SKU " + product.sku + (selectedCountry ? " · " + selectedCountry : " · все страны");
      content.replaceChildren(make("div", "state", "Загружаем подписчиков…"));
      modal.hidden = false;
      document.body.classList.add("modal-open");

      try {
        const params = new URLSearchParams({ sku: product.sku });
        if (selectedCountry) params.set("country", selectedCountry);
        const response = await fetch("/api/manager/subscription-details?" + params.toString(), { cache: "no-store" });
        if (!response.ok) throw new Error("Не удалось загрузить детали: " + response.status);
        const details = await response.json();
        content.replaceChildren();
        if (details.sites.length === 0) {
          content.append(make("div", "state", "Активных подписчиков не найдено."));
          return;
        }
        for (const site of details.sites) {
          const block = make("section", "detail-site");
          const blockHead = make("div", "detail-site__head");
          blockHead.append(make("strong", "", site.country + " · " + site.totalSubscriptions + " подписок"));
          if (site.productUrl) {
            const link = make("a", "detail-link", "Открыть товар на сайте →");
            link.href = site.productUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            blockHead.append(link);
          }
          const subscribers = make("div", "subscribers");
          subscribers.append(...site.subscribers.map(renderSubscriber));
          block.append(blockHead, subscribers);
          content.append(block);
        }
      } catch (error) {
        content.replaceChildren(make("div", "state", error.message));
      }
    }

    async function loadDashboard(forceRefresh = false) {
      document.getElementById("refresh").disabled = true;
      try {
        const response = await fetch("/api/manager/subscriptions" + (forceRefresh ? "?refresh=1" : ""), { cache: "no-store" });
        if (!response.ok) throw new Error("Не удалось загрузить данные: " + response.status);
        dashboard = await response.json();
        if (selectedCountry && !dashboard.countries.some((country) => country.code === selectedCountry)) selectedCountry = null;
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
    document.getElementById("details-close").addEventListener("click", closeDetails);
    document.getElementById("details-modal").addEventListener("click", (event) => {
      if (event.target.id === "details-modal") closeDetails();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDetails();
    });
    loadDashboard();
  </script>
</body>
</html>`;
}

module.exports = { renderManagerDashboard };
