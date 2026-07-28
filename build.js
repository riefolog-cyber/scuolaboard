const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Ordine dei file JS come caricati in index.html
const files = [
  'firebase-init.js',
  'app-config.js',
  'app-utils.js',
  'app-ai.js',
  'app-services.js',
  'app-components.js',
  'app-modals.js',
  'modals.js',
  'auth.js',
  'cards.js',
  'ai.js',
  'app-layout.js',
  'app-handlers.js',
  'app.js',
  'app-bootstrap.js'
];

(async () => {
  try {
    console.log('ScuolaBoard build started...');

    // Leggi e concatena i file
    let code = '';
    for (const file of files) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`File non trovato, saltato: ${file}`);
        continue;
      }
      code += fs.readFileSync(filePath, 'utf8') + '\n';
    }

    // Minifica con Terser
    const result = await minify(code, {
      compress: {
        drop_console: ['log', 'warn'],
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        keep_fnames: true
      },
      format: {
        comments: false
      }
    });

    if (result.error) {
      console.error('Minification error:', result.error);
      process.exit(1);
    }

    // Crea la cartella dist se non esiste
    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir);
    }

    // Scrivi il bundle minificato
    const bundlePath = path.join(distDir, 'app.min.js');
    fs.writeFileSync(bundlePath, result.code, 'utf8');
    console.log(`Bundle creato: ${bundlePath} (${Math.round(result.code.length / 1024)} KB)`);

    // Copia gli asset statici in dist
    const assets = ['styles.css'];
    assets.forEach(asset => {
      const assetPath = path.join(__dirname, asset);
      if (fs.existsSync(assetPath)) {
        fs.copyFileSync(assetPath, path.join(distDir, asset));
        console.log(`Asset copiato: ${asset}`);
      }
    });

    // Genera index.html di produzione con un solo script
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    let prodHtml = indexHtml;

    // Rimuovi tutti i tag script locali e inserisci il bundle minificato
    prodHtml = prodHtml.split('\n').filter(function(line) {
      return !files.some(function(file) {
        return line.includes('src="' + file + '"') && line.includes('<script');
      });
    }).join('\n');

    // Aggiungi il bundle prima del tag </body>
    prodHtml = prodHtml.replace(
      '</body>',
      `<script defer src="app.min.js?t=${Date.now()}"></script>\n</body>`
    );

    fs.writeFileSync(path.join(distDir, 'index.html'), prodHtml, 'utf8');
    console.log('dist/index.html generato per produzione.');
    console.log('ScuolaBoard build completed.');
  } catch (err) {
    console.error('Build error:', err);
    process.exit(1);
  }
})();
