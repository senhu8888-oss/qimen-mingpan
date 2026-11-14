import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        errs = []
        for name, w, h in [("desktop", 1280, 900), ("phone", 390, 844)]:
            pg = await b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            pg.on("console", lambda m: errs.append(f"{name} console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: errs.append(f"{name} pageerror: {e}"))
            await pg.goto("file:///home/claude/qimen-mingpan/dist/index.html")
            await pg.wait_for_timeout(600)
            sw = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            print(name, "horizontal overflow px:", sw)
            await pg.screenshot(path=f"/home/claude/qimen-mingpan/shot-{name}-today.png", full_page=True)
            for tab in ["birth", "calendar", "rules"]:
                await pg.click(f"[data-tab='{tab}']")
                await pg.wait_for_timeout(400)
                sw = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                print(name, tab, "overflow px:", sw)
                await pg.screenshot(path=f"/home/claude/qimen-mingpan/shot-{name}-{tab}.png", full_page=True)
            await pg.close()
        print("\n".join(errs) if errs else "no console errors")
        await b.close()
asyncio.run(main())
