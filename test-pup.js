import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER CRASH:', err.message));

        await page.goto('http://localhost:5174/');
        console.log("Navigated to page");
        await new Promise(r => setTimeout(r, 2000));

        // Find Add Text button and click
        const textBtnClicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const textBtn = btns.find(b => b.title === 'Add Text' || (b.innerHTML && b.innerHTML.includes('Type') || b.textContent.includes('T')));
            if (textBtn) {
                textBtn.click();
                return true;
            }
            return false;
        });
        console.log("Clicked Text Tool", textBtnClicked);
        await new Promise(r => setTimeout(r, 500));

        // Click on canvas
        await page.mouse.click(300, 300);
        console.log("Clicked Canvas");
        await new Promise(r => setTimeout(r, 2000));

        await browser.close();
    } catch (e) {
        console.error("Script error:", e);
    }
})();
