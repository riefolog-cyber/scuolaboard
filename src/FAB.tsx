// FAB.jsx · ScuolaBoard
import { FORM0 } from './app-utils.tsx';

function FAB__({ $ }: any) {
  if ($.simulaSt) return null;
  return (
    <button
      onClick={function () {
        $.setEditMode(null);
        $.setForm(Object.assign({}, FORM0));
        $.setShowModal(true);
      }}
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 100,
        width: 58,
        height: 58,
        borderRadius: '50%',
        border: 'none',
        background: 'linear-gradient(135deg,#6366f1,#a855f7)',
        color: '#fff',
        fontSize: 28,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 6px 30px rgba(99,102,241,.5),0 0 60px rgba(99,102,241,.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform .15s cubic-bezier(.22,1,.36,1),box-shadow .15s',
      }}
      title={$.isProf ? 'Nuova card' : 'Proponi card'}
    >
      +
    </button>
  );
}
export default FAB__;
