// Ergänzt app.json: Für die Web-Version auf GitHub Pages liegt die App in einem
// Unterordner (z. B. /Fabian-Rosenbohm). Der Pfad kommt aus EXPO_BASE_URL.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
