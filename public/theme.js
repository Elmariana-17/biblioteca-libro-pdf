/* Runs before styles to avoid a bright flash when opening at night. */
(() => {
  const key = 'reading-prefs-v2';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const read = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const valid = value => ['system', 'light', 'sepia', 'dark'].includes(value) ? value : 'system';
  let preference = valid(read().theme);
  const resolved = () => preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
  function apply() {
    const dark = resolved() === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c211d' : '#f7f5ef');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.textContent = dark ? '☀ Claro' : '☾ Noche';
      button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo noche');
      button.setAttribute('aria-pressed', String(dark));
    });
    window.dispatchEvent(new Event('library-theme-change'));
  }
  window.libraryTheme = {
    preference: () => preference,
    resolved,
    set(value) {
      preference = valid(value);
      try { localStorage.setItem(key, JSON.stringify({ ...read(), theme: preference })); } catch {}
      apply();
    }
  };
  apply();
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { preference = valid(read().theme); apply(); } });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => window.libraryTheme.set(resolved() === 'dark' ? 'light' : 'dark')));
    apply();
  });
})();
