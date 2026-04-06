import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

const SHEET_ID = '12WPVtndWMBdaWriFDNbZAKowMqu5UuCY2-AiRaTQ984';
const TAB_NAME = 'Garden Plants 2026';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB_NAME)}`;

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:        '#f4f8f0',
  surface:   '#ffffff',
  border:    '#d6e8cc',
  green1:    '#3a7d44',
  green2:    '#5a9e5f',
  green3:    '#8dc98f',
  greenPale: '#e8f5e9',
  terra:     '#c1693a',
  terraPale: '#fdf0e8',
  text:      '#2c2c2c',
  muted:     '#7a8f72',
  yes:       '#2e7d32',
  yesBg:     '#e8f5e9',
  no:        '#c62828',
  noBg:      '#ffebee',
  na:        '#888',
  naBg:      '#f5f5f5',
  shadow:    'rgba(58,125,68,0.08)',
};

const font = {
  display: 'Georgia, serif',
  ui: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

// ── helpers ───────────────────────────────────────────────────────────────────
function parseRows(raw) {
  // find header row by scanning for known column keyword
  let headerIdx = 0;
  for (let i = 0; i < Math.min(raw.length, 6); i++) {
    if (raw[i].some(c => c && c.toLowerCase().includes('plant name'))) {
      headerIdx = i;
      break;
    }
  }
  const headers = raw[headerIdx].map(h => h.trim());
  return raw.slice(headerIdx + 1)
    .filter(r => r.some(c => c && c.trim()))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
      return obj;
    });
}

function col(plant, name) {
  return plant[name] || '';
}

function statusColor(val) {
  if (val === 'Yes') return { color: C.yes, background: C.yesBg };
  if (val === 'No')  return { color: C.no,  background: C.noBg  };
  return { color: C.na, background: C.naBg };
}

// month order for timeline sorting
const MONTH_ORDER = ['April','May','June','July','August','September','October'];
function monthRank(str) {
  for (let i = 0; i < MONTH_ORDER.length; i++) {
    if (str && str.includes(MONTH_ORDER[i])) return i;
  }
  if (str && str.toLowerCase().includes('established')) return -1;
  if (str && str.toLowerCase().includes('now')) return 0;
  return 99;
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatusPill({ val }) {
  const s = statusColor(val);
  return (
    <span style={{
      ...s,
      fontSize: 11,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 10,
      fontFamily: font.ui,
      letterSpacing: '0.03em',
    }}>{val}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '20px 24px',
      boxShadow: `0 2px 12px ${C.shadow}`,
      ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: font.display,
      fontSize: 13,
      fontWeight: 700,
      color: C.green1,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      borderBottom: `2px solid ${C.border}`,
      paddingBottom: 6,
      marginBottom: 14,
    }}>{children}</div>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function Overview({ plants }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const locations = ['All', ...Array.from(new Set(plants.map(p => col(p,'Garden Location')).filter(Boolean)))];

  const filtered = plants.filter(p => {
    const locMatch = filter === 'All' || col(p,'Garden Location') === filter;
    const s = search.toLowerCase();
    const searchMatch = !s ||
      col(p,'Common Nickname').toLowerCase().includes(s) ||
      col(p,'Plant Name').toLowerCase().includes(s) ||
      col(p,'Garden Location').toLowerCase().includes(s);
    return locMatch && searchMatch;
  });

  const statCols = ['Purchased?','Planted?','Pruned #1?','Pruned #2?'];
  const stats = statCols.map(c => ({
    label: c.replace('?',''),
    yes: plants.filter(p => col(p,c) === 'Yes').length,
    no:  plants.filter(p => col(p,c) === 'No').length,
    total: plants.filter(p => col(p,c) !== 'N/A').length,
  }));

  return (
    <div>
      {/* stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:28 }}>
        {stats.map(s => (
          <Card key={s.label}>
            <div style={{ fontFamily:font.display, fontSize:13, color:C.muted, marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:700, fontFamily:font.ui, color:C.green1 }}>{s.yes}<span style={{fontSize:14,color:C.muted}}>/{s.total}</span></div>
            <div style={{ marginTop:8, height:6, borderRadius:3, background:C.border }}>
              <div style={{ height:6, borderRadius:3, background:C.green2, width:`${s.total ? (s.yes/s.total)*100 : 0}%`, transition:'width 0.4s' }} />
            </div>
            <div style={{ fontSize:11, color:C.no, marginTop:4, fontFamily:font.ui }}>{s.no} still needed</div>
          </Card>
        ))}
        <Card style={{ background:C.greenPale }}>
          <div style={{ fontFamily:font.display, fontSize:13, color:C.muted, marginBottom:6 }}>Total Plants</div>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:font.ui, color:C.green1 }}>{plants.length}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:4, fontFamily:font.ui }}>across {locations.length - 1} locations</div>
        </Card>
      </div>

      {/* filters + search */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16, alignItems:'center' }}>
        <input
          placeholder="Search plants..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding:'7px 12px', borderRadius:6, border:`1px solid ${C.border}`,
            fontFamily:font.ui, fontSize:13, color:C.text, background:C.surface,
            outline:'none', width:200,
          }}
        />
        {locations.map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{
            padding:'6px 12px', borderRadius:20, border:`1px solid ${filter===l ? C.green1 : C.border}`,
            background: filter===l ? C.green1 : C.surface,
            color: filter===l ? '#fff' : C.text,
            fontFamily:font.ui, fontSize:12, cursor:'pointer', fontWeight: filter===l ? 700 : 400,
          }}>{l}</button>
        ))}
      </div>

      {/* table */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:font.ui, fontSize:13 }}>
            <thead>
              <tr style={{ background:C.green1, color:'#fff' }}>
                {['Common Name','Location','Sunlight','Type','Plant Date','Purchased?','Planted?','Pruned #1?','Pruned #2?'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:11, letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i) => (
                <tr key={i} style={{ background: i%2===0 ? C.surface : C.greenPale, borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:'9px 14px', fontWeight:600, color:C.text }}>{col(p,'Common Nickname')}</td>
                  <td style={{ padding:'9px 14px', color:C.muted, whiteSpace:'nowrap' }}>{col(p,'Garden Location')}</td>
                  <td style={{ padding:'9px 14px', color:C.muted }}>{col(p,'Sunlight')}</td>
                  <td style={{ padding:'9px 14px', color:C.muted }}>{col(p,'Annual / Perennial')}</td>
                  <td style={{ padding:'9px 14px', color:C.muted, whiteSpace:'nowrap' }}>{col(p,'Plant Date')}</td>
                  {['Purchased?','Planted?','Pruned #1?','Pruned #2?'].map(c => (
                    <td key={c} style={{ padding:'9px 14px' }}><StatusPill val={col(p,c)} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── ACTION ITEMS TAB ──────────────────────────────────────────────────────────
function ActionItems({ plants }) {
  const needBuy   = plants.filter(p => col(p,'Purchased?') === 'No');
  const needPlant = plants.filter(p => col(p,'Purchased?') === 'Yes' && col(p,'Planted?') === 'No');
  const needPrune1 = plants.filter(p => col(p,'Planted?') === 'Yes' && col(p,'Pruned #1?') === 'No');
  const needPrune2 = plants.filter(p => col(p,'Pruned #1?') === 'Yes' && col(p,'Pruned #2?') === 'No');

  function ActionGroup({ title, items, color, icon, dateCol }) {
    if (!items.length) return (
      <Card style={{ marginBottom:20, borderLeft:`4px solid ${C.green3}` }}>
        <SectionTitle>{icon} {title}</SectionTitle>
        <div style={{ color:C.muted, fontFamily:font.ui, fontSize:13 }}>✓ All done!</div>
      </Card>
    );
    return (
      <Card style={{ marginBottom:20, borderLeft:`4px solid ${color}` }}>
        <SectionTitle>{icon} {title} <span style={{ color:C.no, fontWeight:700 }}>({items.length})</span></SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
          {items.map((p,i) => (
            <div key={i} style={{
              background:C.greenPale, borderRadius:8, padding:'12px 14px',
              border:`1px solid ${C.border}`,
            }}>
              <div style={{ fontFamily:font.ui, fontWeight:700, fontSize:13, color:C.text }}>{col(p,'Common Nickname')}</div>
              <div style={{ fontFamily:font.ui, fontSize:11, color:C.muted, marginTop:2 }}>{col(p,'Garden Location')}</div>
              {dateCol && <div style={{ fontFamily:font.ui, fontSize:11, color:C.green1, marginTop:4, fontWeight:600 }}>{col(p,dateCol)}</div>}
              {col(p,'Notes') && <div style={{ fontFamily:font.ui, fontSize:11, color:C.muted, marginTop:4, fontStyle:'italic' }}>{col(p,'Notes')}</div>}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <ActionGroup title="Still Need to Buy" items={needBuy} color={C.no} icon="🛒" dateCol="Plant Date" />
      <ActionGroup title="Purchased — Need to Plant" items={needPlant} color={C.terra} icon="🌱" dateCol="Plant Date" />
      <ActionGroup title="Planted — Need First Prune" items={needPrune1} color={C.green2} icon="✂️" dateCol="First Prune Date" />
      <ActionGroup title="Need Second Prune" items={needPrune2} color={C.green1} icon="✂️✂️" dateCol="Second Prune Date" />
    </div>
  );
}

// ── BY LOCATION TAB ───────────────────────────────────────────────────────────
function ByLocation({ plants }) {
  const locations = Array.from(new Set(plants.map(p => col(p,'Garden Location')).filter(Boolean)));

  const locationColors = [
    '#e8f5e9','#fff3e0','#f3e5f5','#e3f2fd','#fce4ec','#fff9c4','#f1f8e9'
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:20 }}>
      {locations.map((loc, li) => {
        const locPlants = plants.filter(p => col(p,'Garden Location') === loc);
        const purchased = locPlants.filter(p => col(p,'Purchased?') === 'Yes').length;
        const planted   = locPlants.filter(p => col(p,'Planted?')   === 'Yes').length;
        return (
          <Card key={loc} style={{ borderTop:`4px solid ${C.green1}`, background: locationColors[li % locationColors.length] }}>
            <div style={{ fontFamily:font.display, fontSize:16, fontWeight:700, color:C.green1, marginBottom:4 }}>{loc}</div>
            <div style={{ fontFamily:font.ui, fontSize:11, color:C.muted, marginBottom:14 }}>
              {purchased}/{locPlants.length} purchased &nbsp;·&nbsp; {planted}/{locPlants.length} planted
            </div>
            {locPlants.map((p,i) => (
              <div key={i} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'7px 0', borderBottom: i < locPlants.length-1 ? `1px dotted ${C.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontFamily:font.ui, fontSize:13, fontWeight:600, color:C.text }}>{col(p,'Common Nickname')}</div>
                  <div style={{ fontFamily:font.ui, fontSize:11, color:C.muted }}>{col(p,'Annual / Perennial')} · {col(p,'Plant Date')}</div>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <StatusPill val={col(p,'Purchased?')} />
                  <StatusPill val={col(p,'Planted?')} />
                </div>
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}

// ── TIMELINE TAB ──────────────────────────────────────────────────────────────
function Timeline({ plants }) {
  // Build a chronological to-do list from all date fields
  const events = [];

  plants.forEach(p => {
    const name = col(p,'Common Nickname');
    const loc  = col(p,'Garden Location');

    const plantDate = col(p,'Plant Date');
    if (plantDate && plantDate !== '—') {
      events.push({ month: monthRank(plantDate), dateStr: plantDate, action:'Plant', name, loc, status: col(p,'Planted?'), note: col(p,'Notes') });
    }
    const p1 = col(p,'First Prune Date');
    if (p1 && p1 !== '—') {
      events.push({ month: monthRank(p1), dateStr: p1, action:'First Prune', name, loc, status: col(p,'Pruned #1?'), note:'' });
    }
    const p2 = col(p,'Second Prune Date');
    if (p2 && p2 !== '—') {
      events.push({ month: monthRank(p2), dateStr: p2, action:'Second Prune', name, loc, status: col(p,'Pruned #2?'), note:'' });
    }
    const harvest = col(p,'Est. First Harvest / Bloom');
    if (harvest && harvest !== '—') {
      events.push({ month: monthRank(harvest), dateStr: harvest, action:'Harvest / Bloom', name, loc, status:'—', note:'' });
    }
  });

  events.sort((a,b) => a.month - b.month);

  // group by month label
  const grouped = {};
  events.forEach(e => {
    const key = e.dateStr.includes('Spring') ? 'Spring 2027' :
                e.dateStr.toLowerCase().includes('established') ? 'Already Established' :
                e.dateStr.toLowerCase().includes('now') ? 'Now — April' :
                MONTH_ORDER.find(m => e.dateStr.includes(m)) || e.dateStr;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const actionColor = {
    'Plant': C.green1,
    'First Prune': C.terra,
    'Second Prune': '#8B4513',
    'Harvest / Bloom': '#e67e22',
  };

  return (
    <div>
      {Object.entries(grouped).map(([month, evts]) => (
        <div key={month} style={{ marginBottom:28 }}>
          <div style={{
            fontFamily:font.display, fontSize:18, fontWeight:700, color:C.green1,
            marginBottom:12, paddingBottom:6, borderBottom:`2px solid ${C.border}`,
          }}>{month}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
            {evts.map((e,i) => (
              <div key={i} style={{
                background:C.surface, borderRadius:8, padding:'12px 14px',
                border:`1px solid ${C.border}`,
                borderLeft:`4px solid ${actionColor[e.action] || C.green2}`,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontFamily:font.ui, fontWeight:700, fontSize:13, color:C.text }}>{e.name}</div>
                    <div style={{ fontFamily:font.ui, fontSize:11, color:C.muted, marginTop:2 }}>{e.loc}</div>
                  </div>
                  <span style={{
                    fontSize:10, fontWeight:700, fontFamily:font.ui,
                    color: actionColor[e.action] || C.green2,
                    background: `${actionColor[e.action]}18`,
                    padding:'2px 7px', borderRadius:10, whiteSpace:'nowrap', marginLeft:8,
                  }}>{e.action}</span>
                </div>
                {e.note && <div style={{ fontFamily:font.ui, fontSize:11, color:C.muted, marginTop:6, fontStyle:'italic' }}>{e.note}</div>}
                {e.status && e.status !== '—' && (
                  <div style={{ marginTop:8 }}><StatusPill val={e.status} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [plants, setPlants]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState('Overview');

  useEffect(() => {
    fetch(CSV_URL)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch sheet'); return r.text(); })
      .then(csv => {
        const result = Papa.parse(csv, { skipEmptyLines: true });
        setPlants(parseRows(result.data));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const tabs = ['Overview','Action Items','By Location','Timeline'];

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font.ui }}>

      {/* header */}
      <div style={{
        background: C.green1,
        padding:'28px 40px 0',
        boxShadow:'0 2px 12px rgba(0,0,0,0.12)',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:4 }}>
            <span style={{ fontSize:24, }}>🌿</span>
            <h1 style={{
              fontFamily:font.display, fontSize:24, fontWeight:700,
              color:'#fff', letterSpacing:'0.01em', margin:0,
            }}>Brooklyn Garden</h1>
            <span style={{ fontFamily:font.display, fontStyle:'italic', color:C.green3, fontSize:16 }}>2026</span>
          </div>
          <div style={{ display:'flex', gap:4, marginTop:16 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding:'9px 20px',
                background: tab===t ? C.surface : 'transparent',
                color: tab===t ? C.green1 : 'rgba(255,255,255,0.8)',
                border:'none', borderRadius:'6px 6px 0 0',
                fontFamily:font.ui, fontSize:13, fontWeight: tab===t ? 700 : 400,
                cursor:'pointer', transition:'all 0.15s',
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px 40px' }}>
        {loading && (
          <div style={{ textAlign:'center', color:C.muted, fontFamily:font.display, fontSize:18, marginTop:60 }}>
            Loading your garden... 🌱
          </div>
        )}
        {error && (
          <div style={{ textAlign:'center', color:C.no, fontFamily:font.ui, fontSize:14, marginTop:60 }}>
            Error loading sheet: {error}<br/>
            <span style={{ color:C.muted, fontSize:12 }}>Make sure the Google Sheet is shared as "Anyone with the link can view"</span>
          </div>
        )}
        {!loading && !error && (
          <>
            {tab === 'Overview'      && <Overview     plants={plants} />}
            {tab === 'Action Items'  && <ActionItems  plants={plants} />}
            {tab === 'By Location'   && <ByLocation   plants={plants} />}
            {tab === 'Timeline'      && <Timeline     plants={plants} />}
          </>
        )}
      </div>
    </div>
  );
}
