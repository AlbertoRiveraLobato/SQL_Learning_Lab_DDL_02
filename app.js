let db, ready = false;

// Inicializar SQL.js
initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` })
    .then(SQL => {
        db = new SQL.Database();
        ready = true;
        drawTables();
    });

const sqlInput = document.getElementById('sqlInput');
const btnEjecutar = document.getElementById('btnEjecutar');
const btnBorrar = document.getElementById('btnBorrar');
const btnEjemplo1 = document.getElementById('btnEjemplo1');
const output = document.getElementById('output');
const tableCards = document.getElementById('tableCards');

// Permitir tabulador en el textarea para sangrías
sqlInput.addEventListener('keydown', function(e) {
    if (e.key === "Tab") {
        e.preventDefault();
        const { selectionStart, selectionEnd, value } = this;
        this.value = value.substring(0, selectionStart) + "\t" + value.substring(selectionEnd);
        this.selectionStart = this.selectionEnd = selectionStart + 1;
    }
});

// Ejecutar código SQL
btnEjecutar.onclick = function() {
    if (!ready) return;
    const sql = sqlInput.value.trim();
    if (!sql) {
        output.innerHTML = 'Por favor, escribe un comando SQL.';
        output.style.color = '#d84315';
        return;
    }
    try {
        db.run(sql);
        output.style.color = '#388e3c';
        output.innerText = '¡Comando ejecutado correctamente!';
        drawTables();
    } catch (e) {
        output.style.color = '#d84315';
        let helpMsg = getHelpMessage(sql, e.message);
        output.innerHTML = 'Error: ' + e.message + (helpMsg ? '<br><br>' + helpMsg : '');
    }
};

// Borrar el área de texto y mensajes
btnBorrar.onclick = function() {
    sqlInput.value = '';
    output.innerHTML = '';
    sqlInput.focus();
};

// Pegar código de ejemplo 1 en el área de texto (¡NO ejecuta!)
btnEjemplo1.onclick = function() {
    sqlInput.value = 
`CREATE TABLE alumnos (
    ID_alumno INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT
);

CREATE TABLE profesores (
    ID_profesor INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT
);

CREATE TABLE materias (
    ID_materia INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT
);`;
    sqlInput.focus();
    output.innerHTML = 'Código del ejemplo 1 pegado. Pulsa <b>Ejecutar</b> para crear las tablas.';
    output.style.color = '#1565c0';
};

// Dibuja las tablas en tarjetas de colores con su estructura
function drawTables() {
    if (!ready) return;
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    tableCards.innerHTML = '';
    if (!res[0] || !res[0].values.length) {
        tableCards.innerHTML = "<i>No hay tablas en la base de datos.</i>";
        return;
    }
    let color = 0;
    for (let row of res[0].values) {
        const tname = row[0];
        const cols = db.exec(`PRAGMA table_info(${tname});`);
        let fields = '';
        for (let col of cols[0].values) {
            fields += `<li>${col[1]} <span style="color:#e0e0e0;">:</span> <b>${col[2]}</b>${col[5] ? '<span class="pk-mark">PK</span>' : ''}</li>`;
        }
        tableCards.innerHTML += `
            <div class="table-card card-color-${color%3}">
                <div class="table-title">${tname}</div>
                <ul class="fields-list">${fields}</ul>
            </div>
        `;
        color++;
    }
}

// Mensajes de ayuda ampliados (puedes pegar aquí tu función getHelpMessage)
function getHelpMessage(sql, errorMsg) {
    // ...copia aquí la versión pedagógica extendida de la función getHelpMessage...
    return "";
}
