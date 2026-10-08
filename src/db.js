// Persistencia simple en archivo JSON (sin base de datos externa)
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'db.json');

const seed = {
  productos: [
    { id: 1, nombre: 'Martillo 16oz', categoria: 'Herramientas', precio: 85, stock: 20, stockMinimo: 5 },
    { id: 2, nombre: 'Clavos 2" (libra)', categoria: 'Fijación', precio: 12, stock: 100, stockMinimo: 30 },
    { id: 3, nombre: 'Cemento 42.5kg', categoria: 'Construcción', precio: 95, stock: 8, stockMinimo: 10 },
    { id: 4, nombre: 'Pintura blanca galón', categoria: 'Pintura', precio: 160, stock: 15, stockMinimo: 4 }
  ],
  clientes: [{ id: 1, nombre: 'Consumidor Final', telefono: '' }],
  ventas: [],
  contadores: { productos: 5, clientes: 2, ventas: 1 }
};

function cargar() {
  if (!fs.existsSync(FILE)) guardar(seed);
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function guardar(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function siguienteId(db, tabla) {
  return db.contadores[tabla]++;
}

module.exports = { cargar, guardar, siguienteId };
