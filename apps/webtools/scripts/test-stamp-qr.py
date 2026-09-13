"""Browser acceptance: pip install playwright pillow; use installed Edge or Chromium."""
import argparse
import json
import re
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:3000')
    parser.add_argument('--output', default='temp/stamp-qr-acceptance')
    parser.add_argument('--channel', default='msedge')
    args = parser.parse_args()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    results, errors, requests = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=args.channel, headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1100}, accept_downloads=True)
        page.add_init_script('''
            window.stampRuns = [];
            const Original = window.Worker;
            window.Worker = class extends Original {
                constructor(...args) { super(...args); this.entry = { time: Date.now(), terminated: false }; window.stampRuns.push(this.entry); }
                postMessage(data, ...args) { this.entry.options = data.payload; return super.postMessage(data, ...args); }
                terminate() { this.entry.terminated = true; return super.terminate(); }
            };
        ''')
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        page.goto(args.url + '/tools/stamp-qr', wait_until='networkidle')
        text = page.get_by_role('textbox', name='文字或链接')
        brightness = page.get_by_role('spinbutton', name=re.compile('暗色值'))
        slider = page.get_by_role('slider', name='暗色滑块')
        link = page.get_by_role('link', name='下载 PNG')
        expect(brightness).to_have_value('100')
        expect(slider).to_have_attribute('min', '40')
        expect(page.get_by_role('combobox', name='定位符方案', exact=True)).to_have_value('four_sides')
        expect(page.get_by_role('button', name='生成二维码', exact=True)).to_have_count(0)

        def current():
            return link.get_attribute('href') if link.count() else None

        def ready(previous=None):
            expect(link).to_be_visible(timeout=125000)
            if previous:
                expect(link).not_to_have_attribute('href', previous, timeout=125000)
            return current()

        def save(name, gray):
            ready()
            with page.expect_download() as download:
                link.click()
            filename = output / f'{name}.png'
            download.value.save_as(filename)
            assert download.value.failure() is None
            with Image.open(filename) as image:
                assert image.format == 'PNG' and image.width == image.height
                colors = image.convert('L').histogram()
                assert colors[gray] > 0 and colors[0] > 0 and colors[255] > 0
                results.append({'case': name, 'pixels': image.width, 'gray': gray, 'bytes': filename.stat().st_size})
            print(json.dumps(results[-1]), flush=True)

        ready()
        save('default-auto', 100)
        page.screenshot(path=str(output / 'desktop.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(output / 'mobile.png'), full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1100})

        # A burst shorter than the debounce window starts exactly one Worker.
        previous = current()
        before = page.evaluate('stampRuns.length')
        for i in range(8):
            text.fill('debounce-' + str(i))
            page.wait_for_timeout(30)
        assert page.evaluate('stampRuns.length') == before
        ready(previous)
        assert page.evaluate('stampRuns.length') == before + 1
        assert page.evaluate('stampRuns.at(-1).options.text') == 'debounce-7'
        save('debounced', 100)

        # Editing during a longer solve cancels that Worker and only publishes the latest request.
        before = page.evaluate('stampRuns.length')
        text.fill(('abc123-' * 30)[:140])
        page.wait_for_function('(n) => stampRuns.length > n', arg=before)
        expect(text).to_be_enabled()
        previous = current()
        text.fill('latest')
        ready(previous)
        assert page.evaluate('stampRuns.at(-1).options.text') == 'latest'
        assert page.evaluate('(i) => stampRuns[i].terminated', before)
        save('latest-wins', 100)

        # Each individual parameter must trigger regeneration, not just text changes.
        for label, value in [('定位符方案', 'dark_all'), ('定位符宽度', 'dot'), ('五种结构方案', 'only3'), ('每格像素', '12')]:
            previous = current()
            page.get_by_role('combobox', name=label, exact=True).select_option(value)
            ready(previous)
        previous = current()
        slider.focus()
        slider.press('Home')
        slider.press('ArrowLeft')
        expect(slider).to_have_value('40')
        expect(brightness).to_have_value('40')
        ready(previous)
        save('slider-floor-40', 40)
        previous = current()
        brightness.fill('192')
        ready(previous)
        save('numeric-reactive', 192)

        for finder in ['dark_all', 'standard', 'four_sides']:
            for width in ['standard', 'dot']:
                for mode in ['all', 'small', 'only3']:
                    previous = current()
                    text.fill('https://example.com/stamp')
                    for label, value in [('定位符方案', finder), ('定位符宽度', width), ('五种结构方案', mode), ('每格像素', '24')]:
                        page.get_by_role('combobox', name=label, exact=True).select_option(value)
                    brightness.fill('100')
                    ready(previous)
                    save(f'{finder}-{width}-{mode}', 100)
        for length in [1, 60, 140]:
            previous = current()
            text.fill(('abc123-' * 30)[:length])
            ready(previous)
            save(f'length-{length}', 100)
        previous = current()
        text.fill('中文🙂\nsecond line')
        ready(previous)
        save('unicode', 100)

        text.fill('')
        expect(link).to_have_count(0)
        before = page.evaluate('stampRuns.length')
        page.wait_for_timeout(600)
        assert page.evaluate('stampRuns.length') == before
        text.fill('印' * 425)
        expect(page.get_by_text(re.compile('内容超过 H 级二维码'))).to_be_visible(timeout=10000)
        expect(link).to_have_count(0)
        text.fill('stamp-qr')
        brightness.fill('39')
        expect(page.get_by_text(re.compile('暗色亮度须为'))).to_be_visible(timeout=10000)
        expect(link).to_have_count(0)
        page.get_by_role('button', name='恢复默认', exact=True).click()
        ready()
        expect(brightness).to_have_value('100')
        assert not errors, errors
        assert not any('zbar' in url.lower() or 'zxing' in url.lower() for url in requests)
        expect(page.get_by_text('ZBar 校验通过', exact=False)).to_have_count(0)
        browser.close()
    report = {'cases': results, 'page_errors': errors, 'debounce': 'passed', 'latest_only': 'passed', 'slider_min': 40, 'decoder_requests': 0, 'mobile_overflow': False, 'invalid_input': 'passed'}
    (output / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'PASS: {len(results)} automatic generations/downloads; debounce, replacement, slider floor, no decoder.')


if __name__ == '__main__':
    main()
