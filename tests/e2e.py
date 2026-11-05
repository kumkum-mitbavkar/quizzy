"""Browser test for Quizzy: clicks through every screen at phone and desktop size.

    node scripts/dev-server.mjs 5300 &          # or any deployed URL
    python3 tests/e2e.py http://localhost:5300 [--shots tests/output]
    python3 tests/e2e.py https://kumkum-mitbavkar-quizzy.vercel.app --live   # leaves no test names on subject boards

Fails on any console error, sideways scroll, or a step that doesn't do what it should.
"""
import sys, os, re, asyncio, random
from playwright.async_api import async_playwright, expect

BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://localhost:5300'
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
LIVE = '--live' in sys.argv
SIZES = [('phone', 390, 844), ('desktop', 1440, 900)]
passed, failed = [], []
LAST_PAGE = []


def check(name, ok, detail=''):
    (passed if ok else failed).append(name)
    print(('  PASS ' if ok else '  FAIL ') + name + (f'  ({detail})' if detail and not ok else ''))


async def no_overflow(page, where):
    width = await page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    check(f'{where}: no sideways scroll', width <= 0, f'{width}px')


async def shot(page, label):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        await page.screenshot(path=f'{SHOTS}/{label}.jpg', type='jpeg', quality=70)


async def play_round(page, tag, smart_every=2):
    """Answers every question (by click on phone, keyboard on desktop) and lands on results."""
    total = int(re.search(r'of (\d+)', await page.locator('#p-count').inner_text()).group(1))
    for n in range(total):
        await expect(page.locator('#p-count')).to_have_text(f'Question {n + 1} of {total}')
        if not await page.locator('#feedback').is_visible():  # a slow machine may let the clock run out first
            count = await page.locator('.answer').count()
            if tag == 'desktop':
                await page.keyboard.press(str(random.randint(1, count)))
            else:
                try:
                    await page.locator('.answer').nth(n % count).click(timeout=3000)
                except Exception:
                    pass
        await expect(page.locator('#feedback')).to_be_visible()
        if n == 0:
            check(f'{tag}: answer shows right/wrong + explanation', await page.locator('.answer.is-right').count() == 1)
            await shot(page, f'{tag}-feedback')
        if tag == 'desktop':
            await page.keyboard.press('Enter')
        else:
            await page.click('[data-next]')
    await page.wait_for_url(re.compile(r'#/results$'))
    return total


async def run(browser, tag, w, h):
    print(f'\n[{tag} {w}x{h}]')
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 800, has_touch=w < 800)
    page = await ctx.new_page()
    LAST_PAGE[:] = [page]
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))

    # home
    await page.goto(BASE + '/')
    await expect(page.locator('.subject')).to_have_count(6)
    await expect(page.locator('#shelf .qcard').first).to_be_visible()
    check(f'{tag}: home shows subjects and class quizzes', True)
    check(f'{tag}: footer credits Kumkum', 'Kumkum Mitbavkar' in await page.locator('footer').inner_text())
    await no_overflow(page, f'{tag} home')
    await shot(page, f'{tag}-home')

    # wrong PIN, then the sample PIN
    await page.fill('.pin__input', '111111')
    await page.click('.pin__go')
    await expect(page.locator('.pin__msg')).to_contain_text('No quiz has that PIN')
    check(f'{tag}: wrong PIN explains itself', True)
    await page.fill('.pin__input', '48291')
    await page.click('.pin__go')
    await expect(page.locator('.pin__msg')).to_contain_text('6 digits')
    await page.fill('.pin__input', '482913')
    await page.click('.pin__go')
    await page.wait_for_url(re.compile(r'#/quiz/qz-sql-showdown'))
    await expect(page.locator('.lobby__title')).to_have_text('SQL Showdown')
    check(f'{tag}: PIN opens the quiz lobby', True)
    await no_overflow(page, f'{tag} lobby')

    # subject round
    await page.goto(BASE + '/#/play/dbms')
    await expect(page.locator('.answer')).to_have_count(4)
    first = await page.locator('#t-num').inner_text()
    await page.wait_for_timeout(1300)
    check(f'{tag}: timer counts down', int(await page.locator('#t-num').inner_text()) < int(first))
    await no_overflow(page, f'{tag} play')
    await shot(page, f'{tag}-play')
    total = await play_round(page, tag)
    check(f'{tag}: subject round has 10 questions', total == 10)
    await expect(page.locator('.review__item')).to_have_count(10)
    check(f'{tag}: results show the answer review', True)
    await no_overflow(page, f'{tag} results')
    await shot(page, f'{tag}-results')

    # save to the leaderboard
    await page.fill('#player-name', 'K')
    await page.click('#save-form button')
    await expect(page.locator('#save-err')).to_contain_text('at least 2')
    if LIVE:  # keep test names off the real subject boards; saving is checked on the test quiz below
        await page.goto(BASE + '/#/board/dbms')
    else:
        await page.fill('#player-name', f'Test {tag.title()}')
        await page.click('#save-form button')
        await expect(page.locator('.saved')).to_be_visible()
        check(f'{tag}: score saved', True)
        await page.click('.saved a')
        await page.wait_for_url(re.compile(r'#/board/dbms'))
    await expect(page.locator('.rank').first).to_be_visible()
    check(f'{tag}: leaderboard lists scores', await page.locator('.rank').count() >= 3)
    check(f'{tag}: sample players are labelled', await page.locator('.chip--sample').count() > 0)
    await no_overflow(page, f'{tag} leaderboard')
    await shot(page, f'{tag}-board')
    await page.select_option('#board-select', 'qz-aptitude-warmup')
    await page.wait_for_url(re.compile(r'#/board/qz-aptitude-warmup'))
    await expect(page.locator('#board .empty, #board .rank').first).to_be_visible()
    check(f'{tag}: board switcher works', True)

    # studio needs login
    await page.goto(BASE + '/#/studio')
    await page.wait_for_url(re.compile(r'#/login'))
    await page.fill('[name=email]', 'host@quizzy.in')
    await page.fill('[name=password]', 'wrong')
    await page.click('form [type=submit]')
    await expect(page.locator('#auth-err')).to_contain_text('wrong')
    check(f'{tag}: bad password is refused', True)
    await shot(page, f'{tag}-login')
    await page.click('[data-demo]')
    await page.wait_for_url(re.compile(r'#/studio$'))
    await expect(page.locator('.srow').first).to_be_visible()
    check(f'{tag}: demo login opens Quiz Studio', True)
    await no_overflow(page, f'{tag} studio')
    await shot(page, f'{tag}-studio')

    # create a quiz
    await page.click('a[href="#/studio/new"]')
    await page.wait_for_url(re.compile(r'#/studio/new'))
    await page.click('.savebar [type=submit]')
    await expect(page.locator('#ed-err')).to_contain_text('title')
    check(f'{tag}: editor blocks an empty quiz', True)
    title = f'OS Lab Viva {tag} {random.randint(100, 999)}'
    await page.fill('[data-k=title]', title)
    await page.fill('[data-k=topic]', 'OS')
    await page.click('.seg label:has(input[value="20"]) span')
    await page.click('.swatch.c-rose')
    await page.uncheck('[data-k=shuffle]')
    qs = [('Which scheduling gives every process a fixed time slice?', ['FCFS', 'Round Robin', 'SJF', 'Priority'], 1),
          ('What is a deadlock?', ['Processes waiting on each other forever', 'A crashed disk', 'A full RAM', 'A slow CPU'], 0),
          ('Which memory is the fastest?', ['RAM', 'SSD', 'Cache', 'HDD'], 2)]
    for i, (q, opts, ans) in enumerate(qs):
        card = page.locator('.qedit').nth(i)
        await card.locator('[data-f=q]').fill(q)
        for j, o in enumerate(opts):
            await card.locator(f'[data-opt="{j}"]').fill(o)
        await card.locator(f'[data-answer="{ans}"]').click()
    await page.click('[data-add]')
    await expect(page.locator('.qedit')).to_have_count(4)
    card = page.locator('.qedit').nth(3)
    await card.locator('[data-f=q]').fill('What does this print?')
    await card.locator('[data-code]').click()
    await card.locator('[data-f=code]').fill('printf("%d", 7 % 3);')
    await card.locator('[data-opt="0"]').fill('1')
    await card.locator('[data-opt="1"]').fill('2')
    await card.locator('[data-answer="0"]').click()
    await card.locator('[data-f=why]').fill('7 divided by 3 leaves remainder 1.')
    await shot(page, f'{tag}-editor')
    await no_overflow(page, f'{tag} editor')
    await page.click('.savebar [type=submit]')
    await page.wait_for_url(re.compile(r'#/studio$'))
    row = page.locator('.srow', has_text=title)
    await expect(row).to_be_visible()
    check(f'{tag}: new quiz saved with 4 questions', '4 questions' in await row.inner_text())
    pin = re.search(r'PIN (\d{3}) (\d{3})', await row.inner_text())
    pin = pin.group(1) + pin.group(2)

    # edit it
    await row.locator('a', has_text='Edit').click()
    await page.wait_for_url(re.compile(r'#/studio/edit/'))
    await expect(page.locator('[data-k=title]')).to_have_value(title)
    await page.fill('[data-k=title]', title + ' (edited)')
    await page.locator('.qedit').nth(1).locator('[data-move="-1"]').click()
    await expect(page.locator('.qedit').first.locator('[data-f=q]')).to_have_value('What is a deadlock?')
    await page.click('.savebar [type=submit]')
    await page.wait_for_url(re.compile(r'#/studio$'))
    await expect(page.locator('.srow', has_text=title + ' (edited)')).to_be_visible()
    check(f'{tag}: edit saved', True)

    # play it through its PIN
    await page.goto(BASE + f'/#/join?pin={pin}')
    await page.wait_for_url(re.compile(r'#/quiz/'))
    await expect(page.locator('.lobby__title')).to_contain_text('edited')
    await page.click('text=Start quiz')
    await expect(page.locator('#t-num')).to_have_text(re.compile(r'^(20|19)$'))
    await expect(page.locator('#q-text')).to_have_text('What is a deadlock?')
    check(f'{tag}: quiz plays in the host\'s order with its own timer', True)
    total = await play_round(page, tag)
    check(f'{tag}: class quiz round has 4 questions', total == 4)
    await page.fill('#player-name', 'Viva Tester')
    await page.click('#save-form button')
    await expect(page.locator('.saved')).to_be_visible()
    check(f'{tag}: class quiz score saved', True)

    # time out on a question (20 s timer)
    await page.goto(BASE + f'/#/join?pin={pin}')
    await page.click('text=Start quiz')
    await expect(page.locator('#feedback')).to_contain_text('Time’s up', timeout=25000)
    check(f'{tag}: timer runs out to "Time\'s up"', True)
    await page.click('[data-quit]')
    await page.click('.modal [data-v="1"]')
    await page.wait_for_url(re.compile(r'#/quiz/'))
    check(f'{tag}: quit asks first and leaves the round', True)

    # delete it
    await page.goto(BASE + '/#/studio')
    row = page.locator('.srow', has_text=title + ' (edited)')
    await row.locator('[data-del]').click()
    await page.click('.modal [data-v="1"]')
    await expect(page.locator('.srow', has_text=title)).to_have_count(0)
    res = await (await page.request.get(BASE + f'/api/quizzes?pin={pin}')).json()
    check(f'{tag}: deleted quiz and its PIN are gone', res.get('quiz') is None)

    # stats + about
    await page.goto(BASE + '/#/stats')
    await expect(page.locator('.kpi')).to_have_count(4)
    check(f'{tag}: stats count the rounds', int(await page.locator('.kpi b').first.inner_text()) >= 2)
    await no_overflow(page, f'{tag} stats')
    await shot(page, f'{tag}-stats')
    await page.goto(BASE + '/#/about')
    await expect(page.locator('.about')).to_contain_text('Credits')
    await page.goto(BASE + '/#/nowhere')
    await expect(page.locator('.empty')).to_contain_text('Nothing here')
    check(f'{tag}: unknown page has a way back', True)

    # log out
    await page.goto(BASE + '/#/studio')
    await page.click('[data-logout]')
    await page.goto(BASE + '/#/studio')
    await page.wait_for_url(re.compile(r'#/login'))
    check(f'{tag}: log out works', True)

    real = [e for e in errors if 'favicon' not in e]
    check(f'{tag}: zero console errors', not real, '; '.join(real[:3]))
    await ctx.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for tag, w, h in (SIZES if '--only' not in sys.argv else [x for x in SIZES if x[0] == sys.argv[sys.argv.index('--only') + 1]]):
            try:
                await run(browser, tag, w, h)
            except Exception as e:  # a crashed step counts as a failure, then carry on
                import traceback
                where = [l for l in traceback.format_exc().splitlines() if 'e2e.py' in l][-1:]
                check(f'{tag}: flow finished', False, str(e).splitlines()[0] + ' at ' + ' '.join(where).strip())
                if SHOTS and LAST_PAGE:
                    await LAST_PAGE[0].screenshot(path=f'{SHOTS}/{tag}-FAILED.jpg', type='jpeg', quality=70)
        await browser.close()
    print(f'\n{len(passed)} passed, {len(failed)} failed')
    sys.exit(1 if failed else 0)

asyncio.run(main())
