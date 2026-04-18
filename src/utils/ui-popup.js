function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function removeExistingPopup() {
  const existing = document.querySelector('.app-popup-overlay');
  if (existing) {
    existing.remove();
  }
}

export function showStylishPopup(options = {}) {
  const {
    title = 'Notice',
    message = '',
    dismissible = true,
    actions = [{ id: 'ok', label: 'OK', variant: 'primary' }]
  } = options;

  removeExistingPopup();

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-popup-overlay';
    overlay.innerHTML = `
      <div class="app-popup-backdrop" data-popup-dismiss="backdrop"></div>
      <div class="app-popup-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <h3 class="app-popup-title">${escapeHtml(title)}</h3>
        <p class="app-popup-message">${escapeHtml(message)}</p>
        <div class="app-popup-actions">
          ${actions.map((action, index) => {
            const variantClass = action.variant === 'outline'
              ? 'btn btn-outline'
              : action.variant === 'soft'
                ? 'app-popup-soft-btn'
                : 'btn';
            return `<button type="button" class="${variantClass}" data-popup-action="${index}">${escapeHtml(action.label || 'OK')}</button>`;
          }).join('')}
        </div>
      </div>
    `;

    const cleanup = result => {
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      resolve(result);
    };

    const handleKeyDown = event => {
      if (event.key === 'Escape' && dismissible) {
        cleanup('dismiss');
      }
    };

    overlay.querySelectorAll('[data-popup-action]').forEach(button => {
      button.addEventListener('click', () => {
        const actionIndex = Number(button.getAttribute('data-popup-action'));
        const selected = actions[actionIndex];
        cleanup(selected?.id || 'ok');
      });
    });

    overlay.querySelector('[data-popup-dismiss="backdrop"]')?.addEventListener('click', () => {
      if (dismissible) {
        cleanup('dismiss');
      }
    });

    document.addEventListener('keydown', handleKeyDown);
    document.body.appendChild(overlay);
  });
}

export async function showAuthRequiredPopup(message = 'Please sign in to continue.') {
  const action = await showStylishPopup({
    title: 'Sign in required',
    message,
    actions: [
      { id: 'signin', label: 'Sign In', variant: 'primary' },
      { id: 'signup', label: 'Create Account', variant: 'outline' },
      { id: 'dismiss', label: 'Maybe Later', variant: 'soft' }
    ]
  });

  if (action === 'signin') {
    window.location.hash = '#/login';
  }

  if (action === 'signup') {
    window.location.hash = '#/signup';
  }

  return action;
}

export function showInfoPopup(message, title = 'Notice') {
  return showStylishPopup({
    title,
    message,
    actions: [{ id: 'ok', label: 'OK', variant: 'primary' }]
  });
}
