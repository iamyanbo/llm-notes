from pathlib import Path
from urllib.parse import urlsplit
import html, json, os, re, shutil, subprocess
from code_render import render_code
from study_route import day_nav, chapter_label, annotate

ROOT=Path(__file__).resolve().parent
DIST=ROOT/'dist'
CHAPTERS=json.loads((ROOT/'chapters.json').read_text(encoding='utf-8'))
SLUGS={c['slug'] for c in CHAPTERS}
CACHE_ALIASES=('cache','cache--reading-and-writing','cache--counting','cache--three-axes','cache--state-types')
SITE_URL=os.environ.get('SITE_URL','https://iamyanbo.github.io/llm-notes').rstrip('/')
ORIGIN=SITE_URL+'/deepseek'
BASE_PATH=urlsplit(ORIGIN).path.rstrip('/')+'/'

def public_paths(markup):
    """Resolve essay-root resources beneath the Pages project and essay path."""
    return re.sub(r'\b(href|src|poster)="(/(?!/)[^"]*)"',lambda m:f'{m[1]}="{BASE_PATH}{m[2].lstrip("/")}"',markup)
def e(s): return html.escape(str(s),quote=True)
def plain(s): return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def sections(body): return re.findall(r'<section id="([^"]+)"><h2>(.*?)</h2>',body)
def local_link(url,slug=None):
    u=urlsplit(html.unescape(url))
    if u.scheme or u.netloc:return url
    target=u.path.strip('/')
    if target=='cache':return '#compression--why-compress'
    if target in SLUGS:return '#'+target+('--'+u.fragment if u.fragment else '')
    if not u.path and u.fragment and slug:
        if u.fragment in SLUGS or any(u.fragment.startswith(s+'--') for s in SLUGS):return '#'+u.fragment
        return '#'+slug+'--'+u.fragment
    return url

def render_math(body):
    pattern=re.compile(r'<(div|span) class="(math|math-inline)">(.*?)</\1>',re.S)
    matches=list(pattern.finditer(body))
    requests=[{'text':html.unescape(m[3]),'display':m[2]=='math'} for m in matches]
    if not requests:return body
    result=subprocess.run(['node',str(ROOT/'render-math.cjs')],input=json.dumps(requests),text=True,encoding='utf-8',capture_output=True,check=True)
    rendered=iter(json.loads(result.stdout))
    return pattern.sub(lambda m:f'<{m[1]} class="{m[2]}">{next(rendered)}</{m[1]}>',body)

def nav():
    out=[]
    for i,c in enumerate(CHAPTERS):
        slug=c['slug'];raw=(ROOT/'content'/f'{slug}.html').read_text(encoding='utf-8')
        main=f'<a href="#{slug}" class="toc-link contents-section" data-reading-target="{slug}" data-chapter="{slug}"><span class="contents-number">{str(i)+"." if i else ""}</span><span class="contents-title">{e(c["title"])}</span></a>'
        children=''.join(f'<li><a href="#{slug}--{sid}" class="toc-link toc-subsection" data-reading-target="{slug}--{sid}"><span class="contents-number">{str(i)+"."+str(j+1) if i else ""}</span><span class="contents-title">{e(plain(title))}</span></a></li>' for j,(sid,title) in enumerate(sections(raw)))
        out.append(f'<li><details data-contents-chapter="{slug}"><summary aria-label="Toggle subsections for {e(c["title"])}">{main}<span class="contents-expand" aria-hidden="true"></span></summary><ul class="contents-subsections">{children}</ul></details></li>')
    return day_nav()+'<p class="contents-section-label">Browse by section</p><ul class="contents-sections">'+''.join(out)+'</ul>'

def template(body,title='DeepSeek V4 & V4.1'):
    description='The mathematical constructions of DeepSeek V4 and V4.1, developed from context storage through attention, conditional computation and implementation.'
    return public_paths(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(title)} · Yanbo Cheng</title><meta name="description" content="{e(description)}"><meta name="theme-color" content="#f0f4fa"><link rel="canonical" href="{ORIGIN}/"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:type" content="article"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/katex/katex.min.css"><link rel="stylesheet" href="/assets/styles.css"><script type="module" src="/assets/app.mjs"></script></head><body><a class="skip" href="#start">Skip to reading</a><div class="reading-progress" aria-hidden="true"><div></div></div><header class="topbar"><a class="brand" href="#main">DeepSeek notes<span>by Yanbo Cheng</span></a><nav aria-label="Site"><a class="other-notes" href="https://iamyanbo.github.io/llm-notes/">Language notes ↗</a><button class="quiet" data-search-open>Search <kbd>/</kbd></button><button class="quiet contents-button" data-contents-open>Contents</button><button class="theme-toggle quiet" aria-label="Switch colour theme" title="Switch colour theme">◐</button></nav></header>{body}<footer class="site-footer"><a href="{SITE_URL}/">LLM Notes ↑</a><span>October 2026</span><a href="#sources">References &amp; implementation record</a></footer><dialog class="search-dialog"><div class="dialog-top"><label for="search">Find a section</label><button class="quiet" data-search-close aria-label="Close search">Close ×</button></div><input id="search" type="search" placeholder="Compression, experts, replay…" autocomplete="off"><div class="search-results" aria-live="polite"></div></dialog><dialog class="contents-dialog"><div class="dialog-top"><strong>Contents</strong><button class="quiet" data-contents-close>Close ×</button></div><nav class="book-nav" aria-label="Essay sections">{nav()}</nav></dialog></body></html>''')

def hero():
    return '''<section class="hero"><div class="hero-copy"><p class="eyebrow">Language models</p><h1>DeepSeek<br><span>V4 &amp; V4.1</span></h1><p class="hero-deck">Building up the model.</p><p class="hero-intro">Begin with the costs of adding capacity, carrying information through layers and reading a long history. We develop the modules that address them, then connect the complete V4 architecture. V4.1 follows afterwards.</p><div class="hero-actions"><a class="primary-button" href="#start">Begin reading <span>↓</span></a><button class="text-link quiet" data-contents-open>Contents ↓</button></div><a class="resume-link" hidden href="#start">Continue reading ↓</a><p class="hero-study"><a href="#start--week">Seven-day V4 study plan ↓</a> · <a href="#experts">Day 1 reading ↓</a></p></div><aside class="opening-orientation" aria-label="The problems we will develop"><p class="eyebrow">The starting questions</p><p><strong>More capacity.</strong> How can we store more learned transformations without executing all of them for every token?</p><p><strong>Richer state.</strong> How can we retain more coordinates between layers while keeping each costly transformation narrow?</p><p><strong>Longer history.</strong> What can attention retain and read when one entry per past token becomes expensive?</p><p class="orientation-destination">The full architecture is assembled after these constructions, on day 6.</p></aside></section>'''

def legacy_redirect(c):
    slug=c['slug']
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{e(c['title'])} · DeepSeek notes</title><link rel="canonical" href="{ORIGIN}/"><noscript><meta http-equiv="refresh" content="0;url=/#quote"></noscript></head><body><h1>{e(c['title'])}</h1><p><a href="/#{slug}">Read this section in the essay</a>.</p><script>const fragment=location.hash.slice(1);location.replace('/#{slug}'+(/^[a-z0-9-]+$/.test(fragment)?'--'+fragment:''));</script></body></html>'''.replace('/#quote','/#'+slug).replace('/#',BASE_PATH+'#')

def main():
    DIST.mkdir(exist_ok=True)
    shutil.copytree(ROOT/'assets',DIST/'assets',dirs_exist_ok=True)
    for f in (ROOT/'site').glob('*'):shutil.copy2(f,DIST/'assets'/f.name)
    import zipfile
    with zipfile.ZipFile(ROOT/'assets/deepseek-study.zip') as archive:
        code_target=DIST/'assets/code';code_target.mkdir(exist_ok=True)
        (code_target/'compression.py').write_bytes(archive.read('deepseek_study/compression.py'))
    miniature_files=[ROOT/'miniature'/name for name in ('model.py','test_model.py','run.py','README.md','sources.json','results.json')]
    with zipfile.ZipFile(DIST/'assets/deepseek-miniature.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
        for file in miniature_files:archive.write(file,file.name)
    shutil.copy2(ROOT/'miniature/results.json',DIST/'assets/results/miniature-study.json')
    mini_code=DIST/'assets/code/miniature';mini_code.mkdir(exist_ok=True)
    for file in miniature_files:
        if file.suffix=='.py':shutil.copy2(file,mini_code/file.name)
    architecture=subprocess.run(['node',str(ROOT/'render-architecture.mjs')],capture_output=True,text=True,encoding='utf-8',check=True).stdout
    forwards=json.loads(subprocess.run(['node',str(ROOT/'render-forward.mjs')],capture_output=True,text=True,encoding='utf-8',check=True).stdout)
    miniature=subprocess.run(['node',str(ROOT/'render-miniature.mjs')],input=(ROOT/'miniature/results.json').read_text(encoding='utf-8'),capture_output=True,text=True,encoding='utf-8',check=True).stdout
    explanations=json.loads(subprocess.run(['node',str(ROOT/'render-explanations.mjs')],capture_output=True,text=True,encoding='utf-8',check=True).stdout)
    atlas=json.loads(subprocess.run(['node',str(ROOT/'render-atlas.mjs')],capture_output=True,text=True,encoding='utf-8',check=True).stdout)
    index=[];chapters=[]
    for i,c in enumerate(CHAPTERS):
        slug=c['slug'];raw=(ROOT/'content'/f'{slug}.html').read_text(encoding='utf-8');sec=sections(raw)
        raw=render_code(raw)
        raw=raw.replace('<div data-main-architecture></div>',architecture)
        assert len(sec)>=3,f'{slug} needs substantive sections'
        for sid,title in sec:
            chunk=re.search(rf'<section id="{re.escape(sid)}">(.*?)</section>',raw,re.S)[1]
            index.append({'title':plain(title),'chapter':c['title'],'part':c['part'],'url':f'#{slug}--{sid}','text':plain(chunk)})
        raw=raw.replace('<div data-miniature-record></div>',miniature)
        for kind,markup in explanations.items():raw=raw.replace(f'<div data-explanation="{kind}"></div>',markup)
        for kind,markup in atlas.items():raw=raw.replace(f'<div data-architecture-atlas="{kind}"></div>',markup)
        for family,markup in forwards.items():raw=raw.replace(f'<div data-forward-diagram="{family}"></div>',markup)
        raw=re.sub(r'\bid="([^"]+)"',lambda m:f'id="{slug}--{m[1]}"',raw)
        raw=re.sub(r'href="([^"]+)"',lambda m:'href="'+e(local_link(m[1],slug))+'"',raw)
        for j,(_,title) in enumerate(sec):
            subnumber=f'<span class="subsection-number">{i}.{j+1}</span> ' if i else ''
            raw=raw.replace('<h2>'+title+'</h2>','<h3>'+subnumber+title+'</h3>',1)
        raw=annotate(raw,slug)
        number=f'<span class="section-number">{i}.</span> ' if i else ''
        if slug=='compression':
            raw=''.join(f'<span id="{alias}" class="legacy-anchor" aria-hidden="true"></span>' for alias in CACHE_ALIASES)+raw
        chapters.append(f'<section class="reading-chapter" id="{slug}" data-reading-chapter="{slug}" aria-labelledby="{slug}-title"><header class="essay-section-header">{chapter_label(slug)}<h2 id="{slug}-title">{number}{e(c["title"])}</h2></header><div class="prose">{render_math(raw)}</div></section>')
        target=DIST/slug;target.mkdir(exist_ok=True);(target/'index.html').write_text(legacy_redirect(c),encoding='utf-8')
    old_cache=DIST/'cache';old_cache.mkdir(exist_ok=True)
    (old_cache/'index.html').write_text(legacy_redirect({'slug':'cache','title':'Sequence compression'}),encoding='utf-8')
    mobile=f'<details class="mobile-contents" id="mobile-contents"><summary>Contents</summary><nav aria-label="Essay contents on smaller screens">{nav()}</nav></details>'
    body='<main id="main">'+hero()+f'<div class="reader-layout continuous-reader"><aside class="contents-rail" id="contents"><nav aria-label="Essay contents"><span class="rail-label">Contents</span>{nav()}</nav></aside><article class="essay-main" aria-label="DeepSeek architecture notes">'+mobile+''.join(chapters)+'</article></div></main>'
    (DIST/'index.html').write_text(template(body),encoding='utf-8')
    (DIST/'search-index.json').write_text(json.dumps(index,ensure_ascii=False),encoding='utf-8')
    (DIST/'chapters.json').write_text(json.dumps(CHAPTERS,ensure_ascii=False),encoding='utf-8')
    missing=template('<main id="main" class="not-found"><h1>Page not found</h1><p><a href="/">Return to the essay</a>.</p></main>','Page not found')
    (DIST/'404.html').write_text(missing.replace('href="#',f'href="{BASE_PATH}#'),encoding='utf-8')
    (DIST/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+ORIGIN+'/sitemap.xml\n')
    (DIST/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+ORIGIN+'/</loc></url></urlset>')
    print(json.dumps({'major_sections':len(CHAPTERS),'subsections':len(index),'words':sum(len(x['text'].split()) for x in index),'output':str(DIST)}))
if __name__=='__main__':main()
