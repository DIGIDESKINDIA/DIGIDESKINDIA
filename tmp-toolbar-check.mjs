import { chromium } from 'playwright';

const projectRoot = process.cwd();

async function assertPdfViewport(browser, width, height, name) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/pdf-tools/edit-pdf', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('input[type="file"]').first().setInputFiles(`${projectRoot}/test-files/multi-page.pdf`);
  await page.waitForFunction(() => document.querySelectorAll('[data-scroll-page]').length > 0, { timeout: 20000 });

  const initialToolbar = await page.evaluate(() => {
    const toolbar = document.querySelector('.dd-toolbar-scroll');
    const buttons = Array.from(document.querySelectorAll('button'));
    const apply = buttons.find((el) => el.textContent && el.textContent.includes('Apply changes'));
    const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
    const applyRect = apply ? apply.getBoundingClientRect() : null;
    return {
      toolbar: toolbarRect ? { left: toolbarRect.left, top: toolbarRect.top, right: toolbarRect.right, bottom: toolbarRect.bottom, width: toolbarRect.width, height: toolbarRect.height } : null,
      apply: applyRect ? { left: applyRect.left, top: applyRect.top, right: applyRect.right, bottom: applyRect.bottom, width: applyRect.width, height: applyRect.height } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pageCount: document.querySelectorAll('[data-scroll-page]').length,
    };
  });

  const findScroller = () => page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('.dd-editor-shell'));
    const scroller = candidates
      .filter((el) => {
        const style = getComputedStyle(el);
        return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      })
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || candidates[0];
    return scroller ? {
      className: scroller.className,
      scrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      top: scroller.getBoundingClientRect().top,
      height: scroller.getBoundingClientRect().height,
    } : null;
  });

  const initialScroller = await findScroller();

  const scroller = page.locator('.dd-editor-shell').last();
  await scroller.evaluate((el) => {
    el.scrollTop = Math.max(0, el.scrollHeight * 0.6);
  });
  await page.waitForTimeout(500);

  const deep = await page.evaluate(() => {
    const toolbar = document.querySelector('.dd-toolbar-scroll');
    const buttons = Array.from(document.querySelectorAll('button'));
    const apply = buttons.find((el) => el.textContent && el.textContent.includes('Apply changes'));
    const scroller = Array.from(document.querySelectorAll('.dd-editor-shell'))
      .filter((el) => getComputedStyle(el).overflowY !== 'visible')
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    const firstPage = document.querySelector('[data-scroll-page]');
    const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
    const applyRect = apply ? apply.getBoundingClientRect() : null;
    return {
      scroller: scroller ? { scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : null,
      toolbar: toolbarRect ? { left: toolbarRect.left, top: toolbarRect.top, right: toolbarRect.right, bottom: toolbarRect.bottom, width: toolbarRect.width, height: toolbarRect.height } : null,
      apply: applyRect ? { left: applyRect.left, top: applyRect.top, right: applyRect.right, bottom: applyRect.bottom, width: applyRect.width, height: applyRect.height } : null,
      firstPageTop: firstPage ? firstPage.getBoundingClientRect().top : null,
      toolbarVisible: toolbarRect ? toolbarRect.top >= 0 && toolbarRect.bottom <= window.innerHeight : null,
      pageCount: document.querySelectorAll('[data-scroll-page]').length,
    };
  });

  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(500);

  const bottom = await page.evaluate(() => {
    const toolbar = document.querySelector('.dd-toolbar-scroll');
    const buttons = Array.from(document.querySelectorAll('button'));
    const apply = buttons.find((el) => el.textContent && el.textContent.includes('Apply changes'));
    const scroller = Array.from(document.querySelectorAll('.dd-editor-shell'))
      .filter((el) => getComputedStyle(el).overflowY !== 'visible')
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    const pages = [...document.querySelectorAll('[data-scroll-page]')];
    const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
    const applyRect = apply ? apply.getBoundingClientRect() : null;
    const first = pages[0]?.getBoundingClientRect();
    const last = pages[pages.length - 1]?.getBoundingClientRect();
    return {
      scroller: scroller ? { scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : null,
      toolbar: toolbarRect ? { left: toolbarRect.left, top: toolbarRect.top, right: toolbarRect.right, bottom: toolbarRect.bottom, width: toolbarRect.width, height: toolbarRect.height } : null,
      apply: applyRect ? { left: applyRect.left, top: applyRect.top, right: applyRect.right, bottom: applyRect.bottom, width: applyRect.width, height: applyRect.height } : null,
      firstPageTop: first ? first.top : null,
      lastPageTop: last ? last.top : null,
      lastPageBottom: last ? last.bottom : null,
      toolbarVisible: toolbarRect ? toolbarRect.top >= 0 && toolbarRect.bottom <= window.innerHeight : null,
      pageCount: pages.length,
    };
  });

  const toolbarCenterDelta = Math.abs(((initialToolbar.toolbar.left + initialToolbar.toolbar.right) / 2) - (initialToolbar.viewport.width / 2));

  await page.screenshot({ path: `${projectRoot}/behavior-${name}.png`, fullPage: false });

  console.log(JSON.stringify({
    name,
    viewport: { width, height },
    initialScroller,
    initialToolbar,
    deep,
    bottom,
    toolbarCenterDelta,
    pass: toolbarCenterDelta <= 10 && deep.toolbarVisible && bottom.toolbarVisible,
  }, null, 2));

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await assertPdfViewport(browser, 1920, 1080, 'top');
  await assertPdfViewport(browser, 1366, 768, 'responsive');
} finally {
  await browser.close();
}
