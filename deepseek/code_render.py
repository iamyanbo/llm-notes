"""Render readable code directly from the tested source archive."""
from pathlib import Path
import ast, html, io, keyword, re, textwrap, tokenize, zipfile

ROOT=Path(__file__).resolve().parent
SOURCE_PATH='deepseek_study/compression.py'

def highlight_python(source):
    lines=source.splitlines(keepends=True);offsets=[0]
    for line in lines:offsets.append(offsets[-1]+len(line))
    def offset(position):
        row,col=position
        return offsets[min(row-1,len(lines))]+col
    cursor=0;out=[];previous=''
    for token in tokenize.generate_tokens(io.StringIO(source).readline):
        start,end=offset(token.start),offset(token.end)
        if end<=start or token.type in (tokenize.ENDMARKER,tokenize.ENCODING):continue
        if start<cursor:continue
        out.append(html.escape(source[cursor:start]))
        kind=None
        if token.type==tokenize.COMMENT:kind='comment'
        elif token.type==tokenize.STRING:kind='string'
        elif token.type==tokenize.NUMBER:kind='number'
        elif token.type==tokenize.NAME and keyword.iskeyword(token.string):kind='keyword'
        elif token.type==tokenize.NAME and previous in ('def','class'):kind='function'
        text=html.escape(source[start:end])
        out.append(f'<span class="tok-{kind}">{text}</span>' if kind else text)
        if token.type not in (tokenize.NL,tokenize.NEWLINE,tokenize.INDENT,tokenize.DEDENT):previous=token.string
        cursor=end
    out.append(html.escape(source[cursor:]))
    return ''.join(out)

def code_block(source,label,language='python',metadata=''):
    code=highlight_python(source) if language=='python' else html.escape(source)
    return f'<figure class="code-block"{metadata}><figcaption><span>{html.escape(label)}</span><span class="code-actions"><span>{language.title()}</span><button type="button" data-copy-code aria-label="Copy {html.escape(label,quote=True)}">Copy</button></span></figcaption><pre tabindex="0" aria-label="{html.escape(label,quote=True)}"><code class="language-{language}">{code}</code></pre><span class="copy-status" aria-live="polite"></span></figure>'

def render_code(body):
    def excerpt(match):
        attrs=dict(re.findall(r'([\w-]+)="([^"]*)"',match[0]))
        names=attrs['data-code-symbol'].split(',')
        source_path=attrs.get('data-code-file',SOURCE_PATH)
        if source_path.startswith('miniature/'):
            assert source_path in ('miniature/model.py','miniature/run.py'), 'Only published study modules may be excerpted'
            source=(ROOT/source_path).read_text(encoding='utf-8')
        else:
            assert source_path==SOURCE_PATH
            with zipfile.ZipFile(ROOT/'assets/deepseek-study.zip') as archive:source=archive.read(SOURCE_PATH).decode('utf-8')
        lines=source.splitlines();nodes={n.name:n for n in ast.parse(source).body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
        for node in list(nodes.values()):
            if isinstance(node,ast.ClassDef):
                for child in node.body:
                    if isinstance(child,ast.FunctionDef):nodes[node.name+'.'+child.name]=child
        snippets=[];ranges=[]
        if attrs.get('data-code-import')=='torch':snippets.append('import torch')
        elif attrs.get('data-code-import')=='stream':snippets.append('from dataclasses import dataclass\nimport torch')
        for name in names:
            node=nodes[name];first=min([node.lineno]+[d.lineno for d in getattr(node,'decorator_list',[])])
            snippets.append(textwrap.dedent('\n'.join(lines[first-1:node.end_lineno])));ranges.append(f'{first}–{node.end_lineno}')
        code='\n\n\n'.join(snippets)+'\n'
        label=source_path+' · lines '+', '.join(ranges)
        return code_block(code,label,metadata=f' data-source-symbol="{html.escape(",".join(names),quote=True)}" data-source-file="{source_path}"')
    body=re.sub(r'<div data-code-symbol="[^"]+"(?: data-code-[\w-]+="[^"]+")*></div>',excerpt,body)
    # Remaining blocks explicitly identify console commands or interface sketches.
    body=re.sub(r'<pre><code(?: class="language-([a-z]+)")?>(.*?)</code></pre>',lambda m:code_block(html.unescape(m[2]),'Run the component study' if m[1]=='shell' else 'Request-state interface sketch',m[1] or 'text'),body,flags=re.S)
    return body
