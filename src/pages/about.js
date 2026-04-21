const ABOUT_CONTENT = {
  title: 'About OneStop',
  subtitle: 'Crafted style for everyday confidence.',
  body: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus interdum erat id turpis finibus, quis commodo ligula posuere. Integer non vulputate urna. Sed porttitor sem nec odio lacinia, vitae feugiat risus varius.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras malesuada laoreet libero, vel convallis arcu vulputate nec. Suspendisse efficitur ligula in nunc tempus, non volutpat sem ultrices. Praesent eu tortor id erat eleifend interdum.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus iaculis augue at aliquam faucibus. Sed suscipit, mauris non ultrices volutpat, risus turpis mattis mauris, a dignissim sem risus nec massa.'
  ],
  image: '/about%20us.webp'
};

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function AboutPage() {
  return `
    <section class="about-page section" aria-label="About OneStop">
      <div class="container">
        <article class="about-page-layout">
          <div class="about-page-media">
            <img src="${ABOUT_CONTENT.image}" alt="About OneStop" width="1600" height="1067" loading="eager" decoding="async">
          </div>
          <div class="about-page-copy">
            <p class="about-page-kicker">About Us</p>
            <h1>${escapeHtml(ABOUT_CONTENT.title)}</h1>
            <p class="about-page-subtitle">${escapeHtml(ABOUT_CONTENT.subtitle)}</p>
            ${ABOUT_CONTENT.body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
          </div>
        </article>
      </div>
    </section>
  `;
}

export function initAboutPage() {
  return null;
}
