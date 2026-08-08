'use strict';

// Static homepage shell for instant LCP before React hydrates.
// Keep in sync with critical-css in index.html.
module.exports = [
  '<div class="min-h-screen bg-surface overflow-x-hidden">',
  '  <section class="relative min-h-[90vh] flex items-center justify-center bg-primary overflow-hidden">',
  '    <div class="relative z-10 w-full text-center px-4 sm:px-6 max-w-5xl mx-auto pt-20">',
  '      <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight">',
  '        Профессиональная юридическая защита',
  '        <span class="block text-secondary mt-2">ваших интересов</span>',
  '      </h1>',
  '    </div>',
  '  </section>',
  '</div>',
].join('\n');
