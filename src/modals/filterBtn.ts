// filterBtn.ts  ·  helper stile pulsanti filtro (estratto da Modals.tsx)
function filterBtn(active: boolean) {
  return {
    border: '1px solid ' + (active ? 'rgba(var(--c-primary-rgb),.55)' : 'rgba(255,255,255,.12)'),
    borderRadius: 10,
    background: active ? 'linear-gradient(135deg, rgba(var(--c-primary-rgb),.32), rgba(139,92,246,.22))' : 'rgba(255,255,255,.05)',
    color: active ? '#e0e7ff' : 'rgba(255,255,255,.7)',
    cursor: 'pointer',
    fontWeight: active ? 800 : 600,
    fontSize: 11,
    padding: '5px 11px',
    boxShadow: active ? '0 4px 14px rgba(var(--c-primary-rgb),.18)' : 'none',
    transition: 'all .15s ease',
  };
}

export default filterBtn;
