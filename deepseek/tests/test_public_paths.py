import unittest
from urllib.parse import urljoin
from pathlib import Path
from build import BASE_PATH, ORIGIN, public_paths, legacy_redirect


class PublicPathTests(unittest.TestCase):
    def test_rebase_root_resources_without_changing_anchors_or_external_links(self):
        source='<a href="/">Home</a><a href="#experts">Experts</a><script src="/assets/app.mjs"></script><a href="//example.org/x">External</a>'
        result=public_paths(source)
        self.assertIn(f'href="{BASE_PATH}"',result)
        self.assertIn(f'src="{BASE_PATH}assets/app.mjs"',result)
        self.assertIn('href="#experts"',result)
        self.assertIn('href="//example.org/x"',result)

    def test_legacy_redirect_and_search_stay_in_the_deepseek_essay(self):
        page=legacy_redirect({'slug':'experts','title':'Experts'})
        self.assertIn(f"location.replace('{BASE_PATH}#experts'",page)
        self.assertIn(f'url={BASE_PATH}#experts',page)
        self.assertEqual(urljoin(ORIGIN+'/assets/app.mjs','../search-index.json'),ORIGIN+'/search-index.json')
        script=(Path(__file__).resolve().parents[1]/'site/app.mjs').read_text(encoding='utf-8')
        self.assertIn("new URL('../search-index.json',import.meta.url)",script)
        self.assertNotIn("fetch('/search-index.json')",script)


if __name__=='__main__':unittest.main()
