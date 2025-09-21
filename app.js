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

// Permitir tabulaciones en el textarea de SQL
sqlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
    }
});

// Función para analizar el error y sugerir ayuda específica ante comandos MySQL no válidos en SQLite
function getHelpMessage(sql, errorMsg) {
    // 1. CREATE DATABASE / DROP DATABASE
    if (/^\s*create\s+database/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>CREATE DATABASE</code> es válido en MySQL, pero <b>no está soportado en SQLite</b>.<br>
            <b>En SQLite:</b> solo existe una base de datos por archivo, no puedes crear ni seleccionar bases de datos.<br>
            <u>Solución:</u> Usa solo <code>CREATE TABLE</code> y omite <code>CREATE DATABASE</code>.
        `;
    }
    if (/^\s*drop\s+database/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>DROP DATABASE</code> es válido en MySQL, pero <b>no existe en SQLite</b>.<br>
            <b>En SQLite:</b> para empezar de cero, simplemente borra todas las tablas con <code>DROP TABLE</code>.
        `;
    }
    // 2. USE database
    if (/^\s*use\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>USE [database]</code> es solo de MySQL.<br>
            <b>En SQLite:</b> no se seleccionan bases de datos, solo hay una por archivo.
        `;
    }
    // 3. ENGINE=, CHARSET=, COLLATE=
    if (/engine\s*=/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ENGINE=...</code> es una opción de MySQL para elegir el motor de almacenamiento.<br>
            <b>En SQLite:</b> ignora esta parte, SQLite no soporta motores de almacenamiento.
        `;
    }
    if (/charset\s*=/i.test(sql) || /collate\s*=/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>CHARSET=</code> y <code>COLLATE=</code> son opciones de MySQL para codificación y ordenación.<br>
            <b>En SQLite:</b> no se usan, ignora estas opciones.
        `;
    }
    // 4. AUTO_INCREMENT
    if (/auto_increment/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>AUTO_INCREMENT</code> es de MySQL.<br>
            <b>En SQLite:</b> usa <code>INTEGER PRIMARY KEY AUTOINCREMENT</code> como tipo de columna.<br>
            Ejemplo: <code>id INTEGER PRIMARY KEY AUTOINCREMENT</code>.
        `;
    }
    // 5. UNSIGNED
    if (/unsigned/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>UNSIGNED</code> solo existe en MySQL.<br>
            <b>En SQLite:</b> ignora esta palabra, SQLite no soporta tipos <code>UNSIGNED</code>.
        `;
    }
    // 6. DROP COLUMN o MODIFY COLUMN en ALTER TABLE
    if (/alter\s+table\s+\w+\s+drop\s+column/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ALTER TABLE ... DROP COLUMN ...</code> es válido en MySQL.<br>
            <b>En SQLite:</b> no puedes borrar columnas directamente.<br>
            <u>Solución:</u> Crea una nueva tabla sin esa columna, copia los datos antiguos, borra la tabla original y renombra la nueva.
        `;
    }
    if (/alter\s+table\s+\w+\s+modify\s+column/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ALTER TABLE ... MODIFY COLUMN ...</code> es solo de MySQL.<br>
            <b>En SQLite:</b> No puedes modificar columnas directamente. Solo puedes añadir nuevas columnas con <code>ALTER TABLE ... ADD COLUMN ...</code>.
        `;
    }
    if (/alter\s+table\s+\w+\s+change\s+column/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ALTER TABLE ... CHANGE COLUMN ...</code> es solo de MySQL.<br>
            <b>En SQLite:</b> No puedes cambiar el nombre o el tipo de una columna directamente. Solo puedes añadir columnas.
        `;
    }
    // 7. ALTER TABLE ADD PRIMARY KEY o ADD CONSTRAINT
    if (/alter\s+table\s+\w+\s+add\s+primary\s+key/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ALTER TABLE ... ADD PRIMARY KEY</code> no está soportado en SQLite.<br>
            <b>En SQLite:</b> la clave primaria debe definirse en el <code>CREATE TABLE</code>.
        `;
    }
    if (/alter\s+table\s+\w+\s+add\s+constraint/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ALTER TABLE ... ADD CONSTRAINT ...</code> es de MySQL.<br>
            <b>En SQLite:</b> solo puedes añadir columnas con <code>ALTER TABLE ... ADD COLUMN ...</code>; las restricciones deben estar en <code>CREATE TABLE</code>.
        `;
    }
    // 8. FOREIGN KEY (ALTER TABLE)
    if (/alter\s+table\s+\w+\s+add\s+foreign\s+key/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ALTER TABLE ... ADD FOREIGN KEY ...</code> solo está soportado en MySQL.<br>
            <b>En SQLite:</b> las claves foráneas deben definirse en el <code>CREATE TABLE</code>.
        `;
    }
    // 9. DROP INDEX
    if (/drop\s+index/i.test(sql) && /on\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>DROP INDEX ... ON ...</code> es la sintaxis de MySQL.<br>
            <b>En SQLite:</b> la sintaxis correcta es <code>DROP INDEX [nombre_del_índice]</code> (sin <code>ON</code>).
        `;
    }
    // 10. Tipos de datos específicos de MySQL
    if (/\b(enum|set|mediumint|tinyint|double|real|float|decimal|datetime|year|timestamp|tinytext|mediumtext|longtext|tinyblob|mediumblob|longblob)\b/i.test(sql)) {
        return `
            <b>Ayuda:</b> Estás usando un tipo de dato específico de MySQL.<br>
            <b>En SQLite:</b> Usa tipos más genéricos como <code>INTEGER</code>, <code>TEXT</code>, <code>REAL</code>, <code>BLOB</code>, <code>NUMERIC</code>.
        `;
    }
    // 11. IF EXISTS/IF NOT EXISTS en ALTER TABLE
    if (/alter\s+table\s+(if\s+(not\s+)?exists)/i.test(sql)) {
        return `
            <b>Ayuda:</b> <code>ALTER TABLE IF EXISTS</code> solo está soportado en MySQL.<br>
            <b>En SQLite:</b> solo puedes usar <code>IF EXISTS</code> con <code>DROP TABLE</code>.
        `;
    }
    // Puedes seguir ampliando esta función según surjan nuevos patrones en clase

    return "";
}

// Ejecutar código SQL
executeBtn.onclick = function() {
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
