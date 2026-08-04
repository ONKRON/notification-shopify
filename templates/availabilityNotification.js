function getAvailabilityNotificationTemplate(country, subscription) {
  switch (country) {
    case "US":
      return {
        subject: "Product Notification",
        text: `Product ${subscription.sku} is now available in stock.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Product <strong>${subscription.sku}</strong> is now available in stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Best regards<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">16801 Addison Road</p>
      <p style="color: #1fcfca; text-align: left;">Addison TX</p>
      <p style="color: #1fcfca;text-align: left;">Suite 124</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">75001</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "UK":
      return {
        subject: "Product Notification",
        text: `Product ${subscription.sku} is now available in stock.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Product <strong>${subscription.sku}</strong> is now available in stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Best regards<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">71-75 Shelton Street</p>
      <p style="color: #1fcfca; text-align: left;">London</p>
      <p style="color: #1fcfca;text-align: left;">WC2H 9JQ</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">United Kingdom</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    // Добавляем остальные страны по аналогии
    case "DE":
      return {
        subject: "Produktbenachrichtigung",
        text: `Das Produkt ${subscription.sku} ist jetzt auf Lager verfügbar.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Sehr geehrter <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Das Produkt  <strong>${subscription.sku}</strong> ist ab sofort auf Lager verfügbar.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> Wir danken Ihnen herzlich für Ihre anhaltende Unterstützung und freuen uns darauf, Sie mit unserem neuen Abonnementservice betreuen zu dürfen.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Mit besten Grüßen<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "PL":
      return {
        subject: "Powiadomienie o produkcie",
        text: `Produkt ${subscription.sku} jest już dostępny w magazynie.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Szanowny <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Z przyjemnością informujemy, że produkt <strong>${subscription.sku}</strong> jest już dostępny w naszym magazynie.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> Serdecznie dziękujemy za Twoje stałe wsparcie i z niecierpliwością czekamy na możliwość obsługi w ramach naszej nowej usługi subskrypcyjnej.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Z wyrazami szacunku<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "FR":
      return {
        subject: "Notification de produit",
        text: `Le produit ${subscription.sku} est maintenant disponible en stock.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Cher <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Nous avons le plaisir de vous informer que le produit <strong>${subscription.sku}</strong> disponible en stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> Nous vous remercions sincèrement pour votre fidélité et sommes hâte de vous servir grâce à notre nouveau service d’abonnement.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Cordialement<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "IT":
      return {
        subject: "Notifica del prodotto",
        text: `Il prodotto ${subscription.sku} è ora disponibile in magazzino.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Caro <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Siamo lieti di informarvi che il prodotto <strong>${subscription.sku}</strong> è ora disponibile in magazzino.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Vi ringraziamo per il costante sostegno e siamo entusiasti di potervi assistere con il nostro nuovo servizio in abbonamento.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Distinti saluti<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "ES":
      return {
        subject: "Notificación del producto",
        text: `El producto ${subscription.sku} ya está disponible.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Estimado <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Nos complace informarle que el producto <strong>${subscription.sku}</strong> ya se encuentra disponible en stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> . Agradecemos sinceramente su constante apoyo y esperamos atenderle mediante nuestro nuevo servicio de suscripción.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Cordialmente<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    default:
      return null;
  }
}

module.exports = { getAvailabilityNotificationTemplate };
