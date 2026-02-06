(function () {
  const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();

  // Check for Czech locale
  if (lang === 'cs' || lang.startsWith('cs-')) {
    const { origin, pathname, search, hash } = window.location;

    // Prevent redirect loop if already on /cs/
    if (!pathname.startsWith('/cs/')) {
      const newPath = '/cs' + (pathname.startsWith('/') ? pathname : '/' + pathname);
      window.location.replace(origin + newPath + search + hash);
    }
  }
})();