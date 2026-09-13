"""Browser acceptance: pip install playwright pillow; run against exported site or dev server."""
import argparse
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:3000')
    parser.add_argument('--output', default='temp/stamp-qr-acceptance')
    parser.add_argument('--channel', default='msedge')
    args = parser.parse_args()
    output = Path(args.output).resolve(); output.mkdir(parents=True, exist_ok=True)
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
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: requests.append(r.url))
        page.goto(args.url + '/tools/stamp-qr', wait_until='networkidle')
        text = page.get_by_role('textbox', name='文字或链接')
        link = page.get_by_role('link', name='下载 PNG')
        sliders = page.get_by_role('slider')
        expect(sliders).to_have_count(4)
        def values():
            return [int(sliders.nth(i).get_attribute('aria-valuenow')) for i in range(4)]
        assert values() == [64, 112, 238, 255]
        assert page.evaluate('new Set([...document.querySelectorAll("[role=slider]")].map(e=>e.parentElement)).size') == 1
        def current():
            return link.get_attribute('href') if link.count() else None
        def ready(previous=None):
            expect(link).to_be_visible(timeout=125000)
            if previous: expect(link).not_to_have_attribute('href', previous, timeout=125000)
        def save(name):
            ready()
            with page.expect_download() as download: link.click()
            filename = output / f'{name}.png'; download.value.save_as(filename)
            assert download.value.failure() is None
            with Image.open(filename) as image:
                assert image.format == 'PNG' and image.width == image.height
                histogram = image.convert('L').histogram()
                assert histogram[0] > 0 and all(histogram[v] > 0 for v in values())
                results.append({'case': name, 'pixels': image.width, 'colors': values(), 'bytes': filename.stat().st_size})
            print(json.dumps(results[-1]), flush=True)
        ready(); save('default-four-colors')
        page.screenshot(path=str(output / 'desktop.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(output / 'mobile.png'), full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1100})
        # Keyboard boundaries, identity, and strict order.
        previous = current()
        sliders.nth(0).focus(); sliders.nth(0).press('Home'); sliders.nth(0).press('ArrowLeft')
        assert values()[0] == 40
        sliders.nth(1).focus(); sliders.nth(1).press('End')
        assert values() == [40, 237, 238, 255]
        sliders.nth(2).focus(); sliders.nth(2).press('Home'); sliders.nth(2).press('ArrowLeft')
        assert values()[2] == 238
        sliders.nth(3).focus(); sliders.nth(3).press('Home')
        assert values() == [40, 237, 238, 239]
        ready(previous); save('ordered-keyboard')
        # Actual pointer dragging on the shared track.
        previous = current()
        box = sliders.nth(0).bounding_box(); track = sliders.nth(0).locator('..').bounding_box()
        page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
        page.mouse.down(); page.mouse.move(track['x'] + track['width'] * 0.25, track['y'] + track['height']/2, steps=8); page.mouse.up()
        assert 80 < values()[0] < 105
        assert all(a < b for a,b in zip(values(), values()[1:]))
        ready(previous); save('pointer-drag')
        previous = current(); page.get_by_role('button', name='恢复默认').click(); ready(previous)
        assert values() == [64, 112, 238, 255]
        # 150ms debounce: continuous typing starts just one task after the burst.
        text.fill(''); expect(link).to_have_count(0)
        before = page.evaluate('stampRuns.length')
        text.press_sequentially('debounce', delay=15)
        assert page.evaluate('stampRuns.length') == before
        ready(); assert page.evaluate('stampRuns.length') == before + 1
        before = page.evaluate('stampRuns.length')
        text.fill(('abc123-'*30)[:140])
        page.wait_for_function('(n)=>stampRuns.length>n', arg=before)
        expect(text).to_be_enabled(); text.fill('latest'); ready()
        assert page.evaluate('stampRuns.at(-1).options.text') == 'latest'
        assert page.evaluate('(i)=>stampRuns[i].terminated', before)
        for finder in ['standard', 'four_sides']:
            for width in ['standard', 'dot']:
                for mode in ['all', 'small', 'only3']:
                    previous = current(); text.fill('https://example.com/stamp')
                    for label,value in [('定位符方案',finder),('定位符宽度',width),('五种结构方案',mode)]:
                        page.get_by_role('combobox', name=label, exact=True).select_option(value)
                    ready(previous); save(f'{finder}-{width}-{mode}')
        for length in [60,140]:
            previous=current(); text.fill(('abc123-'*30)[:length]); ready(previous); save(f'length-{length}')
        previous=current(); text.fill('中文🙂\nsecond line'); ready(previous); save('unicode')
        text.fill('印'*425)
        expect(page.get_by_text('内容超过 H 级二维码', exact=False)).to_be_visible(timeout=10000)
        expect(link).to_have_count(0)
        page.get_by_role('button', name='恢复默认').click(); ready()
        assert not errors, errors
        assert not any('zbar' in u.lower() or 'zxing' in u.lower() for u in requests)
        browser.close()
    report={'cases':results,'page_errors':errors,'four_handles_one_track':True,'ordered_keyboard_and_pointer':'passed','debounce_ms':150,'latest_only':'passed','decoder_requests':0,'mobile_overflow':False}
    (output/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'PASS: {len(results)} generated/downloaded PNGs; four ordered colors, pointer/keyboard and debounce.')


if __name__=='__main__': main()
