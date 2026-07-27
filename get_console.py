import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        print("Navigating to login...")
        await page.goto("http://192.168.0.15/login")
        await page.fill('input[type="email"]', 'ti@grupo.com')
        await page.fill('input[type="password"]', '123')
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/dashboard")
        print("Navigating to /farms...")
        await page.goto("http://192.168.0.15/farms")
        await page.wait_for_timeout(3000)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
