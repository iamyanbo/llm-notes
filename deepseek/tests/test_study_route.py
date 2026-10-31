import re
import unittest
from pathlib import Path
from study_route import DAYS, ASSIGNMENTS, anchors, annotate, daily_entry

ROOT=Path(__file__).resolve().parents[1]

class StudyRouteTests(unittest.TestCase):
    def test_each_reading_has_one_owner_and_all_targets_exist(self):
        routes=[a for d in DAYS for a in anchors(d)]
        self.assertEqual([d['day'] for d in DAYS],list(range(1,20)))
        self.assertEqual(len(routes),len(set(routes)))
        self.assertEqual(len(routes),len(ASSIGNMENTS))
        for day in DAYS:
            for segment in day['segments']:
                source=(ROOT/'content'/f'{segment["chapter"]}.html').read_text(encoding='utf-8')
                for sid in segment['sections']:
                    self.assertIn(f'<section id="{sid}">',source)
                positions=[source.index(f'<section id="{sid}">') for sid in segment['sections']]
                self.assertEqual(positions,sorted(positions),'Reading labels must follow the source order')
        self.assertEqual(anchors(DAYS[0])[0],'experts--capacity')
        self.assertEqual(anchors(DAYS[0])[-1],'experts--mtp-purpose')
        self.assertEqual(anchors(DAYS[1])[:2],['residuals--wider-stream','residuals--hyper-connections'])
        week=[a for d in DAYS[:7] for a in anchors(d)]
        self.assertNotIn('residuals--single-pass',week)
        self.assertNotIn('training--balanced-updates',week)
        self.assertEqual(ASSIGNMENTS['residuals--single-pass'][0]['day'],8)
        self.assertEqual(ASSIGNMENTS['training--headwise-muon'][0]['day'],17)
        # No substantive later chapter may disappear into an unassigned appendix.
        chapters=__import__('json').loads((ROOT/'chapters.json').read_text())
        for chapter in chapters:
            slug=chapter['slug']
            if slug in ('start','sources'):continue
            for sid in re.findall(r'<section id="([^"]+)">',(ROOT/'content'/f'{slug}.html').read_text(encoding='utf-8')):
                self.assertIn(slug+'--'+sid,ASSIGNMENTS)

    def test_every_day_stops_at_its_last_reading_and_links_to_the_next_day(self):
        page=(ROOT/'dist/index.html').read_text(encoding='utf-8')
        self.assertEqual(len(re.findall(r'<aside class="day-reading-end"',page)),len(DAYS))
        for day in DAYS:
            n=day['day'];route=anchors(day)
            self.assertIn(f'href="#{route[0]}"',daily_entry(day))
            self.assertIn(f'href="#study-day-{n}-stop"',daily_entry(day))
            for a in route:self.assertIn(f'<section id="{a}" data-study-day="{n}">',page)
            final=re.search(rf'<section id="{route[-1]}"[^>]*>(.*?)</section>',page,re.S)[1]
            self.assertIn(f'id="study-day-{n}-stop"',final)
            self.assertIn(f'End of Day {n} · stop here',final)
            if n<len(DAYS):self.assertIn(f'href="#{anchors(DAYS[n])[0]}"',final)
            for part in day['segments'][:-1]:
                end=part['chapter']+'--'+part['sections'][-1]
                chunk=re.search(rf'<section id="{end}"[^>]*>(.*?)</section>',page,re.S)[1]
                next_anchor=route[route.index(end)+1]
                self.assertIn('Continue Day',chunk)
                self.assertIn(f'href="#{next_anchor}"',chunk)
        self.assertNotIn('Further reading · after the V4 week',page)
        self.assertIn('Reference · consult alongside the lessons',page)
        self.assertEqual(page.count('data-day-target="1"'),3)

    def test_all_legacy_sections_and_display_equations_survive_route_annotation(self):
        for file in (ROOT/'content').glob('*.html'):
            raw=file.read_text(encoding='utf-8')
            raw=re.sub(r'id="([^"]+)"',lambda m:f'id="{file.stem}--{m[1]}"',raw)
            raw=re.sub(r'<h2>(.*?)</h2>',r'<h3>\1</h3>',raw)
            out=annotate(raw,file.stem)
            for anchor in re.findall(r'<section id="([^"]+)"',raw):self.assertIn(f'id="{anchor}"',out)
            self.assertEqual(re.findall(r'<div class="math">(.*?)</div>',raw,re.S),re.findall(r'<div class="math">(.*?)</div>',out,re.S))

    def test_each_day_starts_with_one_live_map_and_its_plan_can_open_it(self):
        page=(ROOT/'dist/index.html').read_text(encoding='utf-8')
        self.assertEqual(page.count('data-day-map="'),len(DAYS))
        for day in DAYS:
            n=day['day'];chapter=day['segments'][0]['chapter']
            self.assertIn(f'id="{chapter}--study-day-{n}-map"',page)
            first=re.search(rf'<section id="{anchors(day)[0]}"[^>]*>(.*?)</section>',page,re.S)[1]
            self.assertIn(f'data-day-map="{n}"',first)
            self.assertIn(f'href="#{chapter}--study-day-{n}-map"',daily_entry(day))
            self.assertIn(f'data-open-day-map="{n}"',daily_entry(day))

if __name__=='__main__':unittest.main()
