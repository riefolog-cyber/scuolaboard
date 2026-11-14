// FAB.jsx · ScuolaBoard
import { FORM0 } from './app-utils.tsx';

function FAB__({ $ }: any) {
  if ($.simulaSt) return null;
  return (
    <button
      className="fab-btn"
      aria-label={$.isProf ? 'Nuova card' : 'Proponi card'}
      onClick={function () {
        if ($.apriNuovaCard) $.apriNuovaCard();
        else {
          $.setEditMode(null);
          $.setForm(Object.assign({}, FORM0));
          $.setShowModal(true);
        }
      }}
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 100,
        width: 60,
        height: 60,
        borderRadius: '50%',
        border: 'none',
        background: 'linear-gradient(135deg,var(--c-primary, #6366f1),#a855f7)',
        color: '#fff',
        fontSize: 30,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(var(--c-primary-rgb),.52), 0 0 0 1px rgba(255,255,255,.12) inset',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s ease, filter .16s ease',
      }}
      title={$.isProf ? 'Nuova card' : 'Proponi card'}
    >
      +
    </button>
  );
}
export default FAB__;
