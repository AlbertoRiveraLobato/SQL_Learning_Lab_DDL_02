// Cargar SQL.js y preparar la base de datos
let db;
let colors = ['#b2ebf2', '#ffe082', '#c0ca33', '#f44336', '#ce93d8', '#90caf9', '#ffe0b2', '#80cbc4', '#e6ee9c', '#ffab91'];
let tableColors = {};
let SQL;
let ready = false;

window.initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` }).then(function(SQLLib) {
    SQL = SQLLib;
    db = new SQL.Database();
    ready = true;
    drawTables();
});

const tablesArea = document.getElementById('tables-area');
const output = document.getElementById('output');
const executeBtn = document.getElementById('execute-btn');
const clearBtn = document.getElementById('clear-btn');
const sqlInput = document.getElementById('sql-input');

// Ejecutar código SQL
executeBtn.onclick = function() {
    if (!ready) return;
    const sql = sqlInput.value.trim();
    if (!sql) {
        output.innerText = 'Por favor, escribe un comando SQL.';
        return;
    }
    try {
        db.run(sql);
        output.style.color = '#388e3c';
        output.innerText = '¡Comando ejecutado correctamente!';
        drawTables();
    } catch (e) {
        output.style.color = '#d84315';
        output.innerText = 'Error: ' + e.message;
    }
};

// Limpiar cuadro
clearBtn.onclick = function() {
    sqlInput.value = '';
    output.innerText = '';
};

// Dibujar todas las tablas existentes
function drawTables() {
    tablesArea.innerHTML = '';
    if (!ready) return;
    // Obtener nombres de las tablas
    let res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    if (!res[0]) return;
    let tableNames = res[0].values.map(row => row[0]);
    tableNames.forEach((table, idx) => {
        if (!tableColors[table]) tableColors[table] = colors[idx % colors.length];
        let tableDiv = document.createElement('div');
        tableDiv.className = 'table-graphic';
        tableDiv.style.background = tableColors[table];

        // Cabecera con nombre de tabla
        let header = document.createElement('header');
        header.innerText = table;
        tableDiv.appendChild(header);

        // Obtener info de columnas
        let columnsRes = db.exec(`PRAGMA table_info(${table});`);
        let ul = document.createElement('ul');
        if (columnsRes[0]) {
            columnsRes[0].values.forEach(col => {
                let li = document.createElement('li');
                // col: [cid, name, type, notnull, dflt_value, pk]
                let attr = `${col[1]} (${col[2]})`;
                if (col[3]) attr += ' NOT NULL';
                if (col[5]) attr += ' PK';
                if (col[4] !== null) attr += ` DEFAULT ${col[4]}`;
                li.innerText = attr;
                ul.appendChild(li);
            });
        }
        tableDiv.appendChild(ul);
        tablesArea.appendChild(tableDiv);
    });
}
