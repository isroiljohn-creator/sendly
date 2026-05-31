const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('BROWSER PAGE EXCEPTION:', err.toString());
  });

  console.log('Loading page...');
  try {
    await page.goto('https://www.sendly.uz/ai-agent', { waitUntil: 'networkidle2' });
    console.log('Page loaded.');
  } catch (e) {
    console.error('Failed to load page:', e);
  }

  await browser.close();
})();
