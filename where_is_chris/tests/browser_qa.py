from __future__ import annotations

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("WHERE_IS_CHRIS_QA_URL", "https://x299-a.tailc86908.ts.net/where-is-chris/")
OUTPUT_DIR = Path(os.environ.get("WHERE_IS_CHRIS_QA_OUTPUT_DIR", ROOT / "design"))
OUTPUT_PREFIX = os.environ.get("WHERE_IS_CHRIS_QA_PREFIX", "implementation")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []
    page_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1536, "height": 1024}, device_scale_factor=1)
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(URL, wait_until="networkidle", timeout=60_000)
        page.get_by_role("heading", name="Where is Chris?").wait_for()
        page.locator(".map-host").wait_for(state="visible")
        page.wait_for_timeout(3_000)

        page.screenshot(path=OUTPUT_DIR / f"{OUTPUT_PREFIX}-desktop.png", full_page=True)
        page.get_by_role("button", name="Local detail").click()
        page.wait_for_timeout(600)
        assert page.get_by_role("button", name="Local detail").get_attribute("aria-pressed") == "true"
        page.screenshot(path=OUTPUT_DIR / f"{OUTPUT_PREFIX}-local.png", full_page=True)

        desktop_metrics = page.evaluate(
            """() => ({
                width: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                mapHeight: Math.round(document.querySelector('.map-frame').getBoundingClientRect().height),
                status: document.querySelector('.live-block strong').textContent,
                mapsLoaded: Boolean(window.google?.maps),
            })"""
        )

        page.set_viewport_size({"width": 390, "height": 844})
        page.reload(wait_until="networkidle", timeout=60_000)
        page.wait_for_timeout(2_000)
        mobile_metrics = page.evaluate(
            """() => ({
                width: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                mapsLoaded: Boolean(window.google?.maps),
            })"""
        )
        page.screenshot(path=OUTPUT_DIR / f"{OUTPUT_PREFIX}-mobile.png", full_page=True)
        browser.close()

    print(json.dumps({
        "desktop": desktop_metrics,
        "mobile": mobile_metrics,
        "console_errors": console_errors,
        "page_errors": page_errors,
    }, indent=2))
    if desktop_metrics["scrollWidth"] != desktop_metrics["width"]:
        raise SystemExit("Desktop has horizontal overflow")
    if mobile_metrics["scrollWidth"] != mobile_metrics["width"]:
        raise SystemExit("Mobile has horizontal overflow")
    if not desktop_metrics["mapsLoaded"] or not mobile_metrics["mapsLoaded"]:
        raise SystemExit("Google Maps did not load")
    if page_errors:
        raise SystemExit("Browser page errors were detected")


if __name__ == "__main__":
    main()
