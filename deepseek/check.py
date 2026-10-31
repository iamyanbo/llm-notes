from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import ast, html, json, re, hashlib, textwrap, zipfile
from build import BASE_PATH

ROOT=Path(__file__).resolve().parent
DIST=ROOT/'dist'
class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=set();self.links=[];self.duplicates=[];self.h1=0;self.chapters=[];self.heading_levels=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids:self.duplicates.append(a['id'])
            self.ids.add(a['id'])
        if tag=='h1':self.h1+=1
        if tag in ('h1','h2','h3','h4'):self.heading_levels.append(int(tag[1]))
        if 'data-reading-chapter' in a:self.chapters.append(a['data-reading-chapter'])
        for key in ('href','src','poster'):
            if key in a:self.links.append(a[key])

pages={};errors=[]
for file in DIST.rglob('*.html'):
    p=Page();p.feed(file.read_text(encoding='utf-8'));pages[file.resolve()]=p
    if p.duplicates:errors.append(f'{file}: duplicate IDs {p.duplicates}')
    if p.h1!=1:errors.append(f'{file}: expected one h1')
for file,p in pages.items():
    for link in p.links:
        u=urlsplit(link)
        if u.scheme or u.netloc:continue
        path=unquote(u.path)
        if path.startswith(BASE_PATH):path="/"+path[len(BASE_PATH):]
        target=((DIST/path.lstrip('/')) if path.startswith('/') else (file.parent/path)) if path else file
        if target.is_dir():target=target/'index.html'
        target=target.resolve()
        if not target.exists():errors.append(f'{file.name}: missing {link}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(f'{file}: missing anchor {link}')
for file in (DIST/'assets').rglob('*.css'):
    for relative in re.findall(r'url\([\'"]?([^\'"\)]+)',file.read_text(encoding='utf-8')):
        if relative.startswith('data:'):continue
        target=DIST/relative.lstrip('/') if relative.startswith('/') else file.parent/relative
        if not target.exists():errors.append(f'Missing CSS asset {relative}')
chapters=json.loads((ROOT/'chapters.json').read_text())
for chapter in chapters:
    source=(ROOT/'content'/f'{chapter["slug"]}.html').read_text(encoding='utf-8')
    for formula in re.findall(r'<(?:span|div) class="math(?:-inline)?">(.*?)</(?:span|div)>',source,re.S):
        assert not any(ord(char)<32 for char in formula),f'Control character in source mathematics: {chapter["slug"]}'
assert len(chapters)==19
assert [c['slug'] for c in chapters[:7]]==['start','experts','residuals','compression','attention','positions','v4-forward']
assert {'v4-forward','v41-forward','reference'} <= {c['slug'] for c in chapters}
search=json.loads((DIST/'search-index.json').read_text(encoding='utf-8'))
assert len(search)>=70
root=pages[(DIST/'index.html').resolve()]
root_text=(DIST/'index.html').read_text(encoding='utf-8')
assert 'class="katex-error"' not in root_text,'A mathematical expression failed to render'
assert 'data-reading-chapter="cache"' not in root_text
assert all(anchor in root.ids for anchor in ('cache','cache--counting','cache--reading-and-writing','cache--three-axes','cache--state-types'))
assert 'id="compression--why-compress"' in root_text
assert 'data-explanation="' not in root_text,'An explanatory diagram hook was not rendered'
for kind in ('ced','hash','packing','timing'):
    assert root_text.count(f'data-explanation-study="{kind}"')==1,f'Missing or repeated diagram: {kind}'
assert 'data-architecture-atlas="' not in root_text,'An architecture plate hook was not rendered'
for kind in ('block','ownership'):
    assert root_text.count(f'data-atlas="{kind}"')==1,f'Missing or repeated architecture plate: {kind}'
assert 'data-atlas="whole"' not in root_text,'The duplicated full architecture should not replace the shared interactive figure'
assert 'data-deepseek-architecture' in root_text and 'data-arch-enlarge' in root_text
hero=re.search(r'<section class="hero">.*?</section>',root_text,re.S)[0]
assert 'opening-orientation' in hero and 'data-deepseek-architecture' not in hero,'The opening should motivate the work before the full architecture'
assert root_text.count('data-deepseek-architecture')==1
assert root_text.index('id="v4-forward--architecture"')<root_text.index('data-deepseek-architecture')<root_text.index('id="ced"')
assert 'data-main-architecture' not in root_text,'The architecture placement hook was not rendered'
assert root.chapters==[c['slug'] for c in chapters], 'All sections must occur in one document, in reading order'
for previous,current in zip(root.heading_levels,root.heading_levels[1:]):
    assert current<=previous+1,'Skipped heading level'
for entry in search:
    assert entry['url'].startswith('#') and entry['url'][1:] in root.ids,'Search must stay in the essay'
for link in root.links:
    u=urlsplit(link)
    if u.scheme or u.netloc:continue
    assert u.path.strip('/') not in {c['slug'] for c in chapters},f'Reading link leaves the page: {link}'
for c in chapters:
    legacy=(DIST/c['slug']/'index.html').read_text(encoding='utf-8')
    assert f"location.replace('{BASE_PATH}#{c['slug']}'" in legacy,'Legacy chapter URLs must resolve into the essay'
assert '<a class="primary-button" href="#start">' in (DIST/'index.html').read_text(encoding='utf-8')
with zipfile.ZipFile(DIST/'assets/deepseek-study.zip') as z:
    result=json.loads(z.read('results/initial-study.json'))
    for name,digest in result['implementation_sha256'].items():
        assert hashlib.sha256(z.read(name)).hexdigest()==digest,f'Stale downloaded implementation: {name}'
    assert all(x['max_abs_streaming_error']==0 for x in result['streaming_pooling'])
    assert result['packed_global_cache']['asymptotic_bytes_per_token']==890
    source=z.read('deepseek_study/compression.py').decode('utf-8')
    assert (DIST/'assets/code/compression.py').read_bytes()==z.read('deepseek_study/compression.py')
    source_lines=source.splitlines()
    source_nodes={n.name:n for n in ast.parse(source).body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
    root_text=(DIST/'index.html').read_text(encoding='utf-8')
    excerpts=re.findall(r'<figure class="code-block" data-source-symbol="([^"]+)" data-source-file="([^"]+)">.*?<code class="language-python">(.*?)</code>',root_text,re.S)
    assert len([x for x in excerpts if x[1]=='deepseek_study/compression.py'])==3
    assert len([x for x in excerpts if x[1]=='miniature/model.py'])>=6
    for names,file,markup in excerpts:
        if file=='miniature/model.py':
            implementation=(ROOT/file).read_text(encoding='utf-8');source_lines=implementation.splitlines()
            source_nodes={n.name:n for n in ast.parse(implementation).body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
            for node in list(source_nodes.values()):
                if isinstance(node,ast.ClassDef):
                    for child in node.body:
                        if isinstance(child,ast.FunctionDef):source_nodes[node.name+'.'+child.name]=child
        else:
            source_lines=source.splitlines();source_nodes={n.name:n for n in ast.parse(source).body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
        displayed=html.unescape(re.sub('<[^>]*>','',markup))
        ast.parse(displayed)
        for name in names.split(','):
            n=source_nodes[name];first=min([n.lineno]+[d.lineno for d in getattr(n,'decorator_list',[])])
            assert textwrap.dedent('\n'.join(source_lines[first-1:n.end_lineno])) in displayed,f'Code excerpt differs from tested source: {name}'
    assert 'data-notation-output' not in root_text,'Foundations projection tutorial should not be repeated'
    assert 'id="start--reading"><h3>Prerequisites</h3>' in root_text
    assert '<span class="section-number">1.</span>' in root_text
    for c in chapters:
        for sid,_ in re.findall(r'<section id="([^"]+)"><h2>(.*?)</h2>',(ROOT/'content'/f'{c["slug"]}.html').read_text(encoding='utf-8')):
            assert f'data-reading-target="{c["slug"]}--{sid}"' in root_text,'Contents must include subsection links'
with zipfile.ZipFile(DIST/'assets/deepseek-miniature.zip') as z:
    result=json.loads(z.read('results.json'))
    assert result['tests']['run']==result['tests']['passed']==19
    for name,digest in result['implementation_sha256'].items():
        assert hashlib.sha256(z.read(name)).hexdigest()==digest,f'Stale miniature: {name}'
        assert z.read(name)==(ROOT/'miniature'/name).read_bytes()
    assert not any('__pycache__' in n for n in z.namelist())
    assert json.loads((DIST/'assets/results/miniature-study.json').read_text())==result
    for family in ('v4','v41'):
        assert result['models'][family]['checks']['every_prefix_max_abs']<1e-12
        assert result['models'][family]['checks']['all_present_gradients_finite']
    assert 'data-miniature' in root_text and 'data-forward="v4"' in root_text and 'data-forward="v41"' in root_text
if errors:raise SystemExit('\n'.join(errors))
print(f'Checked {len(root.chapters)} major sections, {len(search)} subsection anchors, heading hierarchy, legacy redirects, local assets, initial diagram, and code excerpts against the tested download.')
