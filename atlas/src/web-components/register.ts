const registerButton = () => {
  if (customElements.get('kl-button')) return;

  class KlButton extends HTMLElement {
    static get observedAttributes() {
      return ['variant', 'size', 'disabled', 'data-active'];
    }

    connectedCallback() {
      this.attachShadow({ mode: 'open' });
      this.render();
      this.shadowRoot?.addEventListener('click', (event) => {
        if (this.getAttribute('disabled') !== null) {
          event.stopImmediatePropagation();
        }
      });
    }

    attributeChangedCallback() {
      this.render();
    }

    render() {
      if (!this.shadowRoot) return;
      const variant = this.getAttribute('variant') ?? 'default';
      const size = this.getAttribute('size') ?? 'md';
      const disabled = this.getAttribute('disabled') !== null;
      const isActive = this.hasAttribute('data-active') || variant === 'primary';

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-flex;
          }
          button {
            all: unset;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            border-radius: 999px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.88rem;
            letter-spacing: 0.01em;
            transition:
              background 180ms ease,
              color 180ms ease,
              transform 180ms ease,
              box-shadow 180ms ease,
              border 180ms ease,
              opacity 180ms ease;
            border: 1px solid var(--color-primary-soft-border, rgba(30, 79, 122, 0.3));
            padding: 0.56rem 1.2rem;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(236, 244, 247, 0.95));
            color: var(--color-primary-dark, #123755);
            text-decoration: none;
            box-shadow: 0 10px 24px rgba(18, 55, 85, 0.08);
          }
          button[data-size="sm"] {
            padding: 0.42rem 0.95rem;
            font-size: 0.82rem;
          }
          button[data-size="lg"] {
            padding: 0.68rem 1.5rem;
            font-size: 0.94rem;
          }
          button:hover:not(:disabled),
          button:focus-visible:not(:disabled) {
            transform: translateY(-2px);
            background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(224, 237, 243, 0.98));
            box-shadow: 0 16px 28px rgba(18, 55, 85, 0.14);
            outline: none;
          }
          button.is-active {
            background: linear-gradient(132deg, var(--color-primary, #1e4f7a), var(--color-accent, #2d7f79), var(--color-secondary, #b18842));
            color: #ffffff;
            border-color: rgba(18, 55, 85, 0.16);
            box-shadow: 0 16px 34px rgba(18, 55, 85, 0.24);
          }
          button:disabled {
            cursor: not-allowed;
            opacity: 0.55;
            transform: none;
            box-shadow: none;
          }
        </style>
        <button class="${isActive ? 'is-active' : ''}" ${disabled ? 'disabled' : ''} data-size="${size}">
          <slot></slot>
        </button>
      `;
    }
  }

  customElements.define('kl-button', KlButton);
};

const registerCard = () => {
  if (customElements.get('kl-card')) return;

  class KlCard extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: 'open' });
      this.render();
    }

    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            border-radius: var(--radius-lg, 30px);
            background: linear-gradient(165deg, var(--color-surface-elevated, #ffffff), #fbfdfc 70%, #f0f5f3);
            border: 1px solid rgba(30, 79, 122, 0.1);
            box-shadow: 0 10px 24px rgba(12, 29, 43, 0.08);
            overflow: hidden;
            transition: transform 280ms ease, box-shadow 280ms ease, border-color 180ms ease;
          }
          :host(:hover) {
            transform: translateY(-3px);
            border-color: rgba(30, 79, 122, 0.2);
            box-shadow: 0 24px 56px rgba(12, 29, 43, 0.12);
          }
          .body {
            padding: clamp(14px, 1.8vw, 20px);
          }
        </style>
        <div class="body">
          <slot></slot>
        </div>
      `;
    }
  }

  customElements.define('kl-card', KlCard);
};

const registerBadge = () => {
  if (customElements.get('kl-badge')) return;

  class KlBadge extends HTMLElement {
    static get observedAttributes() {
      return ['variant'];
    }

    connectedCallback() {
      this.attachShadow({ mode: 'open' });
      this.render();
    }

    attributeChangedCallback() {
      this.render();
    }

    render() {
      if (!this.shadowRoot) return;
      const variant = this.getAttribute('variant') ?? 'primary';
      const variantStyles: Record<string, string> = {
        primary:
          'background: linear-gradient(180deg, rgba(233, 243, 248, 0.95), rgba(226, 239, 244, 0.98)); color: var(--color-primary, #1e4f7a); border: 1px solid rgba(30, 79, 122, 0.22);',
        success: 'background: rgba(47, 133, 90, 0.14); color: #1f6847; border: 1px solid rgba(47, 133, 90, 0.2);',
        warning: 'background: rgba(177, 136, 66, 0.18); color: #6f4f1a; border: 1px solid rgba(177, 136, 66, 0.24);',
        danger: 'background: rgba(196, 71, 71, 0.16); color: #8f2f2f; border: 1px solid rgba(196, 71, 71, 0.2);'
      };
      const style = variantStyles[variant] ?? variantStyles.primary;
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-flex;
          }
          span {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.35rem 0.82rem;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            ${style}
          }
        </style>
        <span>
          <slot></slot>
        </span>
      `;
    }
  }

  customElements.define('kl-badge', KlBadge);
};

const registerSpinner = () => {
  if (customElements.get('kl-spinner')) return;

  class KlSpinner extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: 'open' });
      this.render();
    }

    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-flex;
          }
          .spinner {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid var(--color-primary-soft-16, rgba(30, 79, 122, 0.16));
            border-top-color: var(--color-primary, #1e4f7a);
            animation: spin 0.9s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
        <div class="spinner" role="status" aria-label="Loading"></div>
      `;
    }
  }

  customElements.define('kl-spinner', KlSpinner);
};

export const registerWebComponents = () => {
  if (typeof window === 'undefined') return;
  registerButton();
  registerCard();
  registerBadge();
  registerSpinner();
};
