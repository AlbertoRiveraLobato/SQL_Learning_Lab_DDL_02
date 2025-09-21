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
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> El comando <code>CREATE DATABASE</code> existe en MySQL para crear nuevas bases de datos, pero <b>no está soportado en SQLite</b>.<br>
            <b>Diferencia:</b> En SQLite, cada archivo es una única base de datos y no se pueden crear varias bases de datos dentro de la misma sesión.<br>
            <b>¿Qué hacer?</b> Simplemente omite el <code>CREATE DATABASE</code>. Comienza directamente creando tablas.<br>
            <b>Ejemplo válido en SQLite:</b><br>
            <code>CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT);</code>
        `;
    }
    if (/^\s*drop\s+database/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>DROP DATABASE</code> elimina una base de datos en MySQL, pero <b>no existe en SQLite</b>.<br>
            <b>Diferencia:</b> Para “borrar” una base de datos en SQLite, simplemente elimina el archivo de la base de datos o borra todas las tablas.<br>
            <b>¿Qué hacer?</b> Usa <code>DROP TABLE</code> para cada tabla.<br>
            <b>Ejemplo:</b><br>
            <code>DROP TABLE IF EXISTS alumnos;</code>
        `;
    }
    // 2. USE database
    if (/^\s*use\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>USE [database]</code> cambia de base de datos en MySQL, pero <b>no existe en SQLite</b>.<br>
            <b>Diferencia:</b> En SQLite siempre trabajas con la única base de datos abierta.<br>
            <b>¿Qué hacer?</b> Simplemente elimina este comando y sigue trabajando con las tablas.
        `;
    }
    // 3. ENGINE=, CHARSET=, COLLATE=
    if (/engine\s*=/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ENGINE=...</code> especifica el tipo de almacenamiento en MySQL (por ejemplo, InnoDB o MyISAM).<br>
            <b>Diferencia:</b> <b>SQLite no tiene motores de almacenamiento configurables</b>: siempre usa el suyo propio.<br>
            <b>¿Qué hacer?</b> Elimina <code>ENGINE=...</code> de tu sentencia <code>CREATE TABLE</code>.<br>
            <b>Ejemplo válido en SQLite:</b><br>
            <code>CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT);</code>
        `;
    }
    if (/charset\s*=/i.test(sql) || /collate\s*=/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>CHARSET</code> y <code>COLLATE</code> se usan en MySQL para definir la codificación y la colación de texto.<br>
            <b>Diferencia:</b> SQLite usa UTF-8 por defecto y no permite definir estas opciones en <code>CREATE TABLE</code>.<br>
            <b>¿Qué hacer?</b> Elimina estas opciones de tu SQL.
        `;
    }
    // 4. AUTO_INCREMENT
    if (/auto_increment/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>AUTO_INCREMENT</code> en MySQL crea un contador automático en la columna.<br>
            <b>Diferencia:</b> En SQLite, el equivalente es <code>INTEGER PRIMARY KEY AUTOINCREMENT</code>.<br>
            <b>¿Qué hacer?</b> Cambia la definición de la columna por:<br>
            <code>id INTEGER PRIMARY KEY AUTOINCREMENT</code><br>
            <b>Ejemplo MySQL:</b> <code>id INT AUTO_INCREMENT PRIMARY KEY</code><br>
            <b>Ejemplo SQLite:</b> <code>id INTEGER PRIMARY KEY AUTOINCREMENT</code>
        `;
    }
    // 5. UNSIGNED
    if (/unsigned/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>UNSIGNED</code> define solo números positivos en MySQL.<br>
            <b>Diferencia:</b> SQLite no reconoce <code>UNSIGNED</code> y todos los enteros pueden ser positivos o negativos.<br>
            <b>¿Qué hacer?</b> Elimina <code>UNSIGNED</code> de tu definición.
        `;
    }
    // 6. DROP COLUMN o MODIFY/CHANGE COLUMN en ALTER TABLE
    if (/alter\s+table\s+\w+\s+drop\s+column/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... DROP COLUMN ...</code> elimina columnas en MySQL, pero <b>no está permitido en SQLite</b>.<br>
            <b>Diferencia:</b> SQLite no permite borrar columnas directamente.<br>
            <b>¿Qué hacer?</b> Para eliminar una columna:<br>
            1. Crea una nueva tabla SIN la columna a eliminar.<br>
            2. Copia los datos relevantes.<br>
            3. Borra la tabla original.<br>
            4. Renombra la nueva tabla.<br>
            <b>Ejemplo:</b><br>
            <code>CREATE TABLE nueva AS SELECT campo1, campo2 FROM original;</code>
        `;
    }
    if (/alter\s+table\s+\w+\s+modify\s+column/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... MODIFY COLUMN ...</code> permite cambiar el tipo o restricciones de una columna en MySQL, pero <b>no existe en SQLite</b>.<br>
            <b>¿Qué hacer?</b> Debes crear una nueva tabla con la definición correcta, copiar los datos y borrar la original.
        `;
    }
    if (/alter\s+table\s+\w+\s+change\s+column/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... CHANGE COLUMN ...</code> es específico de MySQL.<br>
            <b>¿Qué hacer?</b> En SQLite, el proceso es el mismo que para borrar o modificar una columna: crear una nueva tabla, copiar datos, borrar la original y renombrar.
        `;
    }
    // 7. ALTER TABLE ADD PRIMARY KEY o ADD CONSTRAINT
    if (/alter\s+table\s+\w+\s+add\s+primary\s+key/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... ADD PRIMARY KEY</code> permite añadir la clave primaria después de crear la tabla en MySQL, pero <b>no está soportado en SQLite</b>.<br>
            <b>¿Qué hacer?</b> Define la clave primaria en el momento de crear la tabla.<br>
            <b>Ejemplo válido en SQLite:</b> <code>CREATE TABLE alumnos (id INTEGER PRIMARY KEY, ...);</code>
        `;
    }
    if (/alter\s+table\s+\w+\s+add\s+constraint/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... ADD CONSTRAINT ...</code> solo está soportado en MySQL.<br>
            <b>Diferencia:</b> En SQLite, las restricciones (PRIMARY KEY, UNIQUE, FOREIGN KEY) deben definirse al crear la tabla.<br>
            <b>¿Qué hacer?</b> Si necesitas añadir una restricción nueva, crea una tabla nueva con la restricción y traspasa los datos.
        `;
    }
    // 8. FOREIGN KEY (ALTER TABLE)
    if (/alter\s+table\s+\w+\s+add\s+foreign\s+key/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... ADD FOREIGN KEY ...</code> no está soportado en SQLite.<br>
            <b>¿Qué hacer?</b> Si necesitas una clave foránea, debes definirla en el <code>CREATE TABLE</code> original.
        `;
    }
    // 9. DROP INDEX ON
    if (/drop\s+index/i.test(sql) && /on\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>DROP INDEX ... ON ...</code> es la sintaxis de MySQL.<br>
            <b>En SQLite:</b> Solo debes poner el nombre del índice.<br>
            <b>Ejemplo SQLite:</b> <code>DROP INDEX nombre_del_indice;</code>
        `;
    }
    // 10. Tipos de datos específicos de MySQL
    if (/\b(enum|set|mediumint|tinyint|double|real|float|decimal|datetime|year|timestamp|tinytext|mediumtext|longtext|tinyblob|mediumblob|longblob)\b/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> Estás usando un tipo de dato específico de MySQL.<br>
            <b>Diferencia:</b> SQLite solo reconoce <code>INTEGER</code>, <code>TEXT</code>, <code>REAL</code>, <code>BLOB</code> y <code>NUMERIC</code>.<br>
            <b>¿Qué hacer?</b> Sustituye el tipo por uno de esos.<br>
            <b>Ejemplo:</b> <code>nombre TEXT</code>, <code>cantidad INTEGER</code>, <code>fecha NUMERIC</code>.
        `;
    }
    // 11. IF EXISTS/IF NOT EXISTS en ALTER TABLE
    if (/alter\s+table\s+(if\s+(not\s+)?exists)/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE IF EXISTS</code> es de MySQL.<br>
            <b>En SQLite:</b> solo puedes usar <code>IF EXISTS</code> con <code>DROP TABLE</code>.<br>
            <b>¿Qué hacer?</b> Elimina <code>IF EXISTS</code> de tus sentencias <code>ALTER TABLE</code>.
        `;
    }
    // Puedes seguir ampliando esta función según observes otros errores en clase.

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
