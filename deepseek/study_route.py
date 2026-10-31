"""Generate day navigation and reading boundaries from one explicit route."""
from pathlib import Path
import html, json, re

ROOT=Path(__file__).resolve().parent
DAYS=json.loads((ROOT/'study-days.json').read_text(encoding='utf-8'))
def esc(value):return html.escape(str(value),quote=True)
def anchors(day):return [f'{segment["chapter"]}--{sid}' for segment in day['segments'] for sid in segment['sections']]
ASSIGNMENTS={anchor:(day,index) for day in DAYS for index,anchor in enumerate(anchors(day))}

def day_nav():
    groups=[('The V4 week',DAYS[:7]),('Continue with V4.1 and implementation',DAYS[7:])]
    return ''.join('<details class="day-route-nav" open><summary>'+title+'</summary><ol>'+''.join(f'<li><a data-day-target="{d["day"]}" href="#{anchors(d)[0]}"><strong>Day {d["day"]}</strong><span>{esc(d["title"])}</span></a><a class="day-stop-link" href="#study-day-{d["day"]}-stop" aria-label="Stopping point for day {d["day"]}">Stop</a></li>' for d in group)+'</ol></details>' for title,group in groups)

def chapter_label(slug):
    days=[str(d['day']) for d in DAYS if any(s['chapter']==slug for s in d['segments'])]
    if days:return '<p class="chapter-study-label">'+('Day ' if len(days)==1 else 'Days ')+' &amp; '.join(days)+' · study route</p>'
    if slug=='start':return ''
    return '<p class="chapter-study-label">Reference · consult alongside the lessons</p>'

def daily_entry(day):
    return f'<nav class="day-guide-links" aria-label="Day {day["day"]} reading boundaries"><a href="#{anchors(day)[0]}">Start Day {day["day"]} →</a><a href="#study-day-{day["day"]}-stop">See today’s stopping point</a><a href="#{day["segments"][0]["chapter"]}--study-day-{day["day"]}-map" data-open-day-map="{day["day"]}" aria-haspopup="dialog">Open today’s module map</a></nav>'

def annotate(raw,slug):
    def replace(match):
        anchor,body=match[1],match[2]
        assigned=ASSIGNMENTS.get(anchor)
        if not assigned:
            if slug!='start' and any(s['chapter']==slug for d in DAYS for s in d['segments']):
                body=body.replace('</h3>','</h3><p class="day-section-label day-later">Reference detail · consult with the linked lesson</p>',1)
            return f'<section id="{anchor}">{body}</section>'
        day,index=assigned;number=day['day'];route=anchors(day)
        label=f'<p class="day-section-label">Day {number} · reading {index+1} of {len(route)}</p>'
        body=body.replace('</h3>','</h3>'+label,1)
        segment=next(s for s in day['segments'] if anchor in [s['chapter']+'--'+sid for sid in s['sections']])
        if anchor==segment['chapter']+'--'+segment['sections'][0]:
            part=day['segments'].index(segment)+1
            note=' Follow the V4 family in the controls; the V4.1 comparison is on Day 16.' if slug=='reference' else ''
            body=body.replace(label,label+f'<aside class="day-reading-start"><strong>Day {number} · {esc(day["title"])}</strong><span>Reading block {part} of {len(day["segments"])}.{note}</span><a href="#start--day-{number}">Today’s plan</a><a href="#study-day-{number}-stop">Today’s stopping point ↓</a></aside>',1)
        if anchor==segment['chapter']+'--'+segment['sections'][-1]:
            if index==len(route)-1:
                next_day=DAYS[number] if number<len(DAYS) else None
                follow=f'<a href="#{anchors(next_day)[0]}">Start Day {number+1}: {esc(next_day["title"])} →</a>' if next_day else '<a href="#start--continuation">Return to the continuation plan ↑</a>'
                body+=f'<aside class="day-reading-end" id="study-day-{number}-stop"><strong>End of Day {number} · stop here</strong><p>{esc(day["finish"])}</p>{follow}<a href="#start--day-{number}">Review today’s plan</a></aside>'
            else:
                next_anchor=route[index+1]
                body+=f'<nav class="day-reading-continue" aria-label="Continue Day {number}"><strong>Continue Day {number}</strong><a href="#{next_anchor}">Go to the next reading block →</a><span>The material in between is outside today’s route.</span></nav>'
        return f'<section id="{anchor}" data-study-day="{number}">{body}</section>'
    raw=re.sub(r'<section id="([^"]+)">(.*?)</section>',replace,raw,flags=re.S)
    if slug=='start':
        for day in DAYS:
            raw=re.sub(rf'(<details class="study-day" id="start--day-{day["day"]}"[^>]*><summary>.*?</summary>)',lambda m:m[1]+daily_entry(day),raw,count=1,flags=re.S)
    return raw
