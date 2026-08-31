import { S as SGlobal } from '../app-utils.tsx';
// OpzioniSondaggio.tsx  ·  estratto da NuovaCardModal (split God-file)

function OpzioniSondaggio(props: any) {
  var form = props.form,
    setForm = props.setForm;
  var S = props.S || SGlobal;
  return (
    <div style={{ marginBottom: 10 }}>
      {
        <label className="u-label" style={{ display: 'block', marginBottom: 4 }}>
          OPZIONI
        </label>
      }
      {form.opzioni.map(function (o: any, i: number) {
        return (
          <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {
              <input
                value={o}
                onInput={function (e: any) {
                  setForm(function (p: any) {
                    var ops = p.opzioni.slice();
                    ops[i] = e.target.value;
                    return Object.assign({}, p, { opzioni: ops });
                  });
                }}
                placeholder={'Opzione ' + (i + 1)}
                aria-label={'Opzione ' + (i + 1)}
                style={S.input}
              />
            }
            {form.opzioni.length > 2 && (
              <button
                aria-label="Rimuovi opzione"
                onClick={function () {
                  setForm(function (p: any) {
                    return Object.assign({}, p, {
                      opzioni: p.opzioni.filter(function (_: any, j: number) {
                        return j !== i;
                      }),
                    });
                  });
                }}
                className="icon-del"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {form.opzioni.length < 6 && (
        <button
          onClick={function () {
            setForm(function (p: any) {
              return Object.assign({}, p, { opzioni: p.opzioni.concat(['']) });
            });
          }}
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px dashed rgba(255,255,255,.15)',
            borderRadius: 7,
            padding: '5px 12px',
            cursor: 'pointer',
            fontSize: 12,
            color: 'rgba(255,255,255,.58)',
            width: '100%',
          }}
        >
          + Aggiungi opzione
        </button>
      )}
    </div>
  );
}
export default OpzioniSondaggio;
