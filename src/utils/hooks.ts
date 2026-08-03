// src/utils/hooks.ts — hook e utility pure React
// Estratto da app-utils.ts (Fase 2d): dipende solo da React (globale),
// nessuna dipendenza da Firestore.

export function useCountUp(target, duration) {
  var [val, setVal] = React.useState(0);
  React.useEffect(
    function () {
      if (!target) return;
      var tNum = Number(target) || 0;
      var start = 0,
        step = Math.ceil(tNum / 30),
        t = null;
      function tick() {
        start += step;
        if (start >= tNum) {
          setVal(tNum);
          return;
        }
        setVal(start);
        t = setTimeout(tick, duration / 30);
      }
      t = setTimeout(tick, 50);
      return function () {
        if (t) clearTimeout(t);
      };
    },
    [target]
  );
  return val;
}


