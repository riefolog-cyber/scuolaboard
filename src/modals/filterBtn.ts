// filterBtn.ts  ·  helper stile pulsanti filtro (estratto da Modals.tsx)
function filterBtn(active: boolean) {
  return {
    border: '1px solid ' + (active ? 'rgba(99,102,241,.5)' : 'rgba(255,255,255,.1)'),
    borderRadius: 8,
    background: active ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.04)',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,.58)',
    cursor: 'pointer',
    fontWeight: active ? 800 : 500,
    fontSize: 11,
    padding: '4px 10px',
  };
}

export default filterBtn;
