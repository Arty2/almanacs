import { chromium } from 'playwright-core';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const out = '/tmp/claude-0/-home-user-almanacs/7c64d4a1-992c-57bd-9886-df22f12cac3f/scratchpad';
const ev=(uid,t,s,e,a=false)=>({uid,title:t,description:'',descriptionSnippet:'',location:'',start:s,end:e,allDay:a});
const scratch=[
  ev('tall','Strategy review','2026-06-30T08:00:00.000Z','2026-06-30T11:00:00.000Z'),
  ev('short','Quick sync','2026-06-30T13:00:00.000Z','2026-06-30T13:20:00.000Z'),
  ev('night','Overnight on-call','2026-06-30T21:30:00.000Z','2026-07-01T00:30:00.000Z'),
  ev('ad1','Conference','2026-06-30T00:00:00.000Z','2026-07-01T00:00:00.000Z',true),
  ev('ad2','PTO: Sam','2026-06-30T00:00:00.000Z','2026-07-01T00:00:00.000Z',true),
  ev('ad3','Launch week','2026-06-30T00:00:00.000Z','2026-07-01T00:00:00.000Z',true),
  ev('ad4','Sprint','2026-06-30T00:00:00.000Z','2026-07-01T00:00:00.000Z',true),
];
const config = { feeds: [{ id:'scratchpad:default', source:{kind:'scratchpad',id:'default'}, name:'Draft', collapsed:false, order:0, kind:'events', category:'none', color:'sky' }], weekTzTop:'Europe/London', weekTzBottom:'America/New_York', timezone:'Europe/London', schemaVersion:1 };
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(([c,s])=>{ localStorage.setItem('calendar-timeline:config', JSON.stringify(c)); localStorage.setItem('calendar-timeline:scratchpad', JSON.stringify(s)); }, [config, scratch]);
await page.goto('http://localhost:4319/?z=1w', { waitUntil:'networkidle' }).catch(()=>{});
await page.waitForTimeout(1200);
await page.evaluate(()=>{ const s=document.querySelector('.wg-scroll'); s.scrollTop = 7*26; });
await page.evaluate(()=>{ const d=document.querySelector('.wg-days'); const r=d.getBoundingClientRect(); d.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:r.left+300,clientY:r.top+220,bubbles:true})); });
await page.waitForTimeout(200);
await page.screenshot({ path: out + '/features.png' });
await browser.close();
