document.getElementById('static-seo')?.remove();

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root not found');
}

let started = false;

async function boot() {
  if (started) return;
  started = true;

  const [React, { createRoot }, { default: App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./App.tsx'),
  ]);

  createRoot(root).render(
    React.createElement(React.StrictMode, null, React.createElement(App))
  );
}

function scheduleHomeBoot() {
  const run = () => {
    void boot();
  };

  const idle = window.requestIdleCallback;
  if (idle) {
    idle(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 1);
  }

  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, run, { once: true, passive: true });
  });
}

if (root.querySelector('.lcp-header')) {
  scheduleHomeBoot();
} else {
  void boot();
}
