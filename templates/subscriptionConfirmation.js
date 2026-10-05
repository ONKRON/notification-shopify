function getSubscriptionConfirmationTemplate(country, { nickname, sku }) {
  switch (country) {
    case "US":
      return {
        subject: "Product Notification",
        text: "Simplify Your Life with Our Product Subscription!",
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
  
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
      
      <!-- Основной текст -->
      <p style="margin-top: 20px;">We are thrilled to introduce our new subscription service for the <strong>${sku}</strong>! This service ensures you have uninterrupted access to your favorite products without the need to reorder manually.</p>
      
      <!-- Заголовок -->
      <h3 style="color: #1fcfca; margin-top: 30px;">Why Subscribe?</h3>
      
      <!-- Список преимуществ -->
      <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
          <li ><strong><p>Convenience:</p></strong> Enjoy regular deliveries of ${sku} right to your doorstep, perfectly timed to fit your schedule.</li>
          <li ><strong><p>Savings:</p></strong> Take advantage of exclusive discounts and special offers available only to our subscribers.</li>
          <li ><strong><p>Flexibility:</p></strong> Adjust your delivery frequency, skip a delivery, or cancel your subscription at any time with ease.</li>
          <li ><strong><p>Priority Service:</p></strong> Be the first to hear about new products, special events, and limited-time promotions.</li>
      </ul>
  
      <!-- Благодарность -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
  
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Best regards, Alex<br>Onkron Technologies</p>
  
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
       
          <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
  </div>`,
      };
    case "UK":
      return {
        subject: "Product Notification",
        text: "Simplify Your Life with Our Product Subscription!",
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
  
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
      
      <!-- Основной текст -->
      <p style="margin-top: 20px;">We are thrilled to introduce our new subscription service for the <strong>${sku}</strong>! This service ensures you have uninterrupted access to your favorite products without the need to reorder manually.</p>
      
      <!-- Заголовок -->
      <h3 style="color: #1fcfca; margin-top: 30px;">Why Subscribe?</h3>
      
      <!-- Список преимуществ -->
      <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
          <li ><strong><p>Convenience:</p></strong> Enjoy regular deliveries of ${sku} right to your doorstep, perfectly timed to fit your schedule.</li>
          <li ><strong><p>Savings:</p></strong> Take advantage of exclusive discounts and special offers available only to our subscribers.</li>
          <li ><strong><p>Flexibility:</p></strong> Adjust your delivery frequency, skip a delivery, or cancel your subscription at any time with ease.</li>
          <li ><strong><p>Priority Service:</p></strong> Be the first to hear about new products, special events, and limited-time promotions.</li>
      </ul>
  
      <!-- Благодарность -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
  
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Best regards, Alex<br>Onkron Technologies</p>
  
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
       
          <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
  </div>`,
      };
    case "DE":
      return {
        subject: "Produktbenachrichtigung",
        text: "Vereinfachen Sie Ihr Leben mit unserem Produktabonnement!",
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
  
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Sehr geehrter <span style="color: #1fcfca;font-weight: 600;">Kunde</span>!</p>
      
      <!-- Основной текст -->
      <p style="margin-top: 20px;">mit großer Freude präsentieren wir Ihnen unseren neuen Abonnementservice für <strong>${sku}</strong>! Dieser Service gewährleistet, dass Sie ununterbrochen Zugriff auf Ihre bevorzugten Produkte haben, ohne jedes Mal manuell nachbestellen zu müssen.</p>
      
      <!-- Заголовок -->
      <h3 style="color: #1fcfca; margin-top: 30px;">Warum ein Abonnement abschließen?</h3>
      
      <!-- Список преимуществ -->
      <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
          <li ><strong><p>Bequemlichkeit:</p></strong> Erhalten Sie den  ${sku} in regelmäßigen Abständen direkt bis an Ihre Haustür, genau abgestimmt auf Ihren persönlichen Zeitplan.</li>
          <li ><strong><p>Einsparungen:</p></strong> Profitieren Sie von exklusiven Rabatten und Sonderangeboten, die ausschließlich für unsere Abonnenten verfügbar sind.</li>
          <li ><strong><p>Flexibilität:</p></strong> Passen Sie die Lieferfrequenz individuell an, setzen Sie eine Lieferung aus oder beenden Sie Ihr Abonnement ganz unkompliziert.</li>
          <li ><strong><p>Prioritätsservice:</p></strong> Erhalten Sie frühzeitig Informationen über neue Produkte, besondere Events und zeitlich begrenzte Aktionen.</li>
      </ul>
  
      <!-- Благодарность -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Wir danken Ihnen herzlich für Ihre beständige Unterstützung und freuen uns darauf, Sie mit unserem neuen Abonnementservice noch besser zu betreuen.</p>
  
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Mit freundlichen Grüßen, Alex<br>Onkron Technologies</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
  
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
  
      <!-- Копирайт -->
       
          <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
  </div>`,
      };
    case "PL":
      return {
        subject: "Powiadomienie o produkcie",
        text: "Uprość swoje życie dzięki naszej subskrypcji produktów!",
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
  
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Drogi <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
      
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Z przyjemnością prezentujemy nasz nowy serwis subskrypcyjny dla produktu <strong>${sku}</strong>! Dzięki temu serwisowi zyskujesz nieprzerwany dostęp do swoich ulubionych produktów bez konieczności każdorazowego składania zamówienia.</p>
      
      <!-- Заголовок -->
      <h3 style="color: #1fcfca; margin-top: 30px;">Dlaczego warto wybrać subskrypcję? </h3>
      
      <!-- Список преимуществ -->
      <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
          <li ><strong><p>Wygoda:</p></strong> Regularne dostawy  ${sku} bezpośrednio pod twoje drzwi, idealnie dopasowane do twojego planu dnia.</li>
          <li ><strong><p>Oszczędności:</p></strong> Skorzystaj z wyjątkowych rabatów i specjalnych ofert przeznaczonych wyłącznie dla subskrybentów.</li>
          <li ><strong><p>Elastyczność:</p></strong> Możliwość dostosowania częstotliwości dostaw, pominięcia wybranej dostawy czy rezygnacji z subskrypcji w każdej chwili, bez zbędnych komplikacji.</li>
          <li ><strong><p>Priorytetowa obsługa:</p></strong> Uzyskuj informacje o nowych produktach, specjalnych wydarzeniach i ograniczonych czasowo promocjach jako pierwszy.</li>
      </ul>
  
      <!-- Благодарность -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Dziękujemy za twoje stałe wsparcie. Z niecierpliwością czekamy na możliwość świadczenia usług w ramach naszego nowego serwisu subskrypcyjnego.</p>
  
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Z wyrazami szacunku, Alex<br>Onkron Technologies</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
  
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
  
      <!-- Копирайт -->
       
          <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
  </div>`,
      };
    case "FR":
      return {
        subject: "Notification de produit",
        text: "Simplifiez-vous la vie avec notre abonnement aux produits!",
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
  
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Cher <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
      
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Nous avons le plaisir de vous annoncer notre nouveau service d’abonnement pour le <strong>${sku}</strong>! Grâce à ce service, bénéficiez d’un accès ininterrompu à vos produits préférés, sans avoir à renouveler vos commandes manuellement.</p>
      
      <!-- Заголовок -->
      <h3 style="color: #1fcfca; margin-top: 30px;">Pourquoi choisir l'abonnement?</h3>
      
      <!-- Список преимуществ -->
      <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
          <li ><strong><p>Commodité:</p></strong> Profitez de livraisons régulières de ${sku} directement à votre porte, parfaitement synchronisées avec votre emploi du temps.</li>
          <li ><strong><p>Économies:</p></strong> Bénéficiez de réductions exclusives et d’offres spéciales réservées exclusivement à nos abonnés.</li>
          <li ><strong><p>Souplesse:</p></strong> Ajustez votre fréquence de livraison, sautez une livraison ou annulez votre abonnement à tout moment.</li>
          <li ><strong><p>Service prioritaire:</p></strong> Soyez le premier informé des nouveaux produits, des événements spéciaux et des promotions à durée limitée.</li>
      </ul>
  
      <!-- Благодарность -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Nous vous remercions sincèrement pour votre fidélité et sommes hâte de vous servir grâce à notre nouveau service d’abonnement.</p>
  
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Meilleures salutations, Alex<br>Onkron Technologies</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
  
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
  
      <!-- Копирайт -->
       
          <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
  </div>`,
      };
    case "IT":
      return {
        subject: "Notifica del prodotto",
        text: "Semplificate la vostra vita con il nostro abbonamento ai prodotti!",
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
  
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Caro  <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
      
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Siamo lieti di annunciare il lancio del nostro nuovo servizio di abbonamento per il <strong>${sku}</strong>! Con questa nuova formula, avrà sempre accesso ai suoi prodotti preferiti senza dover effettuare ordini manuali.</p>
      
      <!-- Заголовок -->
      <h3 style="color: #1fcfca; margin-top: 30px;">Perché scegliere l’abbonamento?</h3>
      
      <!-- Список преимуществ -->
      <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
          <li ><strong><p>Praticità:</p></strong> Riceva il ${sku} con consegne periodiche direttamente a casa sua, pianificate per adattarsi perfettamente alle sue esigenze.</li>
          <li ><strong><p>Vantaggi economici:</p></strong> Approfitti di sconti esclusivi e offerte riservate solo agli abbonati.</li>
          <li ><strong><p>Massima flessibilità:</p></strong> Modifichi la frequenza delle consegne, salti una spedizione o annulli l’abbonamento quando vuole, senza complicazioni.</li>
          <li ><strong><p>Servizio prioritario:</p></strong> Rimanga sempre aggiornato su nuovi prodotti, eventi speciali e promozioni a tempo limitato.</li>
      </ul>
  
      <!-- Благодарность -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Si ringraziamo per la sua fedeltà e siamo entusiasti di potersi servire con il nostro nuovo servizio di abbonamento.</p>
  
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Cordiali saluti, Alex<br>Onkron Technologies</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
  
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
  
      <!-- Копирайт -->
       
          <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
  </div>`,
      };
    case "ES":
      return {
        subject: "Notificación del producto",
        text: "¡Simplifique su vida con nuestra suscripción de productos!",
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
  
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Estimado <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
      
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Nos complace anunciar el lanzamiento de nuestro nuevo servicio de suscripción para el <strong>${sku}</strong>! Con este servicio, tendrá acceso continuo a sus productos favoritos sin necesidad de gestionar pedidos manualmente.</p>
      
      <!-- Заголовок -->
      <h3 style="color: #1fcfca; margin-top: 30px;">¿Por qué optar por la suscripción?</h3>
      
      <!-- Список преимуществ -->
      <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
          <li ><strong><p>Comodidad:</p></strong> Recibe el  ${sku} de manera periódica y directamente en tu domicilio, con un calendario adaptado a tu rutina.</li>
          <li ><strong><p>Ahorros:</p></strong> Disfrute de descuentos exclusivos y promociones especiales disponibles únicamente para nuestros suscriptores.</li>
          <li ><strong><p>Flexibilidad:</p></strong> Modifique la frecuencia de las entregas, salte un envío o cancele tu suscripción cuando lo desea, de forma sencilla.</li>
          <li ><strong><p>Servicio preferente:</p></strong> Descubra al tanto de nuevos lanzamientos, eventos especiales y ofertas por tiempo limitado antes que nadie.</li>
      </ul>
  
      <!-- Благодарность -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Agradecemos su lealtad y esperamos poder servirse con nuestro nuevo servicio de suscripción.</p>
  
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Atentamente, Alex<br>Onkron Technologies</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
  
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
  
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
  
      <!-- Копирайт -->
       
          <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
  </div>`,
      };
    case "TR":
      return {
        subject: "Ürün stok bildirimi",
        text: `${sku} ürünü için stok bildirimi talebiniz alınmıştır. Ürün yeniden stokta olduğunda size e-posta göndereceğiz.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="ONKRON" width="300" style="display: block; margin: 0 auto;"/>
      <p style="margin-top: 20px;">Sayın <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>,</p>
      <p style="margin-top: 20px;"><strong>${sku}</strong> ürünü için stok bildirimi talebinizi aldık.</p>
      <p>Ürün yeniden stokta olduğunda size e-posta ile haber vereceğiz.</p>
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">ONKRON'u tercih ettiğiniz için teşekkür ederiz.</p>
      <p style="margin-top: 20px;text-align: left;">Saygılarımızla<br>ONKRON Technologies</p>
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <p style="margin-top: 20px;text-align:right;">© 2026 ONKRON Türkiye</p>
  </div>`,
      };
    default:
      return null;
  }
}

module.exports = { getSubscriptionConfirmationTemplate };
