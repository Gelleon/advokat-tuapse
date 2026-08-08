document.getElementById('static-seo')?.remove();

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root not found');
}

async function boot() {
  const [React, { createRoot }, { default: App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./App.tsx'),
  ]);

  createRoot(root).render(
    React.createElement(React.StrictMode, null, React.createElement(App))
  );
}

void boot();
