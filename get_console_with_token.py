import asyncio
import os
import sys

# Setup python path so we can import backend code
sys.path.append(os.path.join(os.getcwd(), "python-backend"))
from core.security import create_access_token

async def run():
    from playwright.async_api import async_playwright
    
    # Generate token for admin user
    token = create_access_token({"sub": "admin", "role": "admin"})
    print("Generated token:", token)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Listen to console
        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        
        print("Setting token in localStorage...")
        # Need to navigate to the domain first before setting localStorage
        await page.goto("http://192.168.0.15/login")
        await page.evaluate(f"localStorage.setItem('token', '{token}')")
        await page.evaluate("localStorage.setItem('user', JSON.stringify({id: 1, role: 'admin'}))")
        
        print("Navigating to /farms...")
        await page.goto("http://192.168.0.15/farms")
        
        # Wait for the page to load and API calls to complete
        await page.wait_for_timeout(10000)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
