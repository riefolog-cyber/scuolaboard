// useTheme.ts — tema chiaro/scuro con persistenza localStorage
var useState = React.useState;
var useEffect = React.useEffect;
var useCallback = React.useCallback;

var THEME_KEY = 'sb_theme';
var THEME_LIGHT = 'light';
var THEME_DARK = 'dark';

function getInitialTheme(): string {
  try {
    var saved = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    if (saved === THEME_LIGHT || saved === THEME_DARK) return saved;
  } catch (e) {}
  try {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return THEME_LIGHT;
    }
  } catch (e2) {}
  return THEME_DARK;
}

function applyTheme(theme: string) {
  try {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    // per compatibilità con CSS che usa html[data-theme] o body
    try { document.body.setAttribute('data-theme', theme); } catch (e2) {}
    if (theme === THEME_LIGHT) {
      root.style.colorScheme = 'light';
    } else {
      root.style.colorScheme = 'dark';
    }
  } catch (e) {}
}

export function useTheme() {
  var [theme, setTheme] = useState(getInitialTheme);

  useEffect(function () {
    applyTheme(theme);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }, [theme]);

  // applica tema iniziale al mount prima del primo paint (evita flash)
  useEffect(function () {
    applyTheme(theme);
  }, []);

  var toggleTheme = useCallback(function () {
    setTheme(function (prev: string) {
      var next = prev === THEME_DARK ? THEME_LIGHT : THEME_DARK;
      applyTheme(next);
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
      return next;
    });
  }, []);

  var isLight = theme === THEME_LIGHT;

  return { theme: theme, isLight: isLight, toggleTheme: toggleTheme, setTheme: setTheme };
}

export default useTheme;
