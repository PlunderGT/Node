const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ferretería corriendo en http://localhost:${PORT}`));
