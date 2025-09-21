let db, ready = false;

// Carga e inicializa SQL.js
initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` })
    .then(SQL => {
        db = new SQL.Database();
        ready = true;
        drawTables();
    });

// Botón ejecutar y salida
const sqlInput = document.getElementById('sqlInput');
const executeBtn = document.getElementById('executeBtn');
const output = document.getElementById('output');
const tablesDiv = document.getElementById('tables');
const btnEjemplo1 = document.getElementById('btnEjemplo1');

// Ejecutar SQL escrito por el usuario
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

// Botón para crear el Ejemplo 1
btnEjemplo1.onclick = crearEjemplo1;

function crearEjemplo1() {
    const ejemploSQL = `
        CREATE TABLE IF NOT EXISTS alumnos (
            ID_alumno INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT
        );
        CREATE TABLE IF NOT EXISTS profesores (
            ID_profesor INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT
        );
        CREATE TABLE IF NOT EXISTS materias (
            ID_materia INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT
        );
    `;
    try {
        db.run(ejemploSQL);
        output.style.color = '#388e3c';
        output.innerHTML = '¡Ejemplo 1 creado! Se han creado las tablas <b>alumnos</b>, <b>profesores</b> y <b>materias</b>.';
        drawTables();
    } catch (e) {
        output.style.color = '#d84315';
        let helpMsg = getHelpMessage(ejemploSQL, e.message);
        output.innerHTML = 'Error: ' + e.message + (helpMsg ? '<br><br>' + helpMsg : '');
    }
}

// Dibuja las tablas y sus columnas
function drawTables() {
    if (!ready) return;
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    if (!res[0] || !res[0].values.length) {
        tablesDiv.innerHTML = "<i>No hay tablas en la base de datos.</i>";
        return;
    }
    let html = '';
    for (let row of res[0].values) {
        const tname = row[0];
        const cols = db.exec(`PRAGMA table_info(${tname});`);
        html += `<div class="table-title">${tname}</div>`;
        html += `<table><tr><th>Nombre</th><th>Tipo</th><th>PK</th></tr>`;
        for (let col of cols[0].values) {
            html += `<tr>
                <td>${col[1]}</td>
                <td>${col[2]}</td>
                <td>${col[5] ? '✅' : ''}</td>
            </tr>`;
        }
        html += `</table>`;
    }
    tablesDiv.innerHTML = html;
}

// Función de ayuda pedagógica ampliada
function getHelpMessage(sql, errorMsg) {
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
    if (/^\s*use\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>USE [database]</code> cambia de base de datos en MySQL, pero <b>no existe en SQLite</b>.<br>
            <b>Diferencia:</b> En SQLite siempre trabajas con la única base de datos abierta.<br>
            <b>¿Qué hacer?</b> Simplemente elimina este comando y sigue trabajando con las tablas.
        `;
    }
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
    if (/unsigned/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>UNSIGNED</code> define solo números positivos en MySQL.<br>
            <b>Diferencia:</b> SQLite no reconoce <code>UNSIGNED</code> y todos los enteros pueden ser positivos o negativos.<br>
            <b>¿Qué hacer?</b> Elimina <code>UNSIGNED</code> de tu definición.
        `;
    }
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
    if (/alter\s+table\s+\w+\s+add\s+foreign\s+key/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... ADD FOREIGN KEY ...</code> no está soportado en SQLite.<br>
            <b>¿Qué hacer?</b> Si necesitas una clave foránea, debes definirla en el <code>CREATE TABLE</code> original.
        `;
    }
    if (/drop\s+index/i.test(sql) && /on\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>DROP INDEX ... ON ...</code> es la sintaxis de MySQL.<br>
            <b>En SQLite:</b> Solo debes poner el nombre del índice.<br>
            <b>Ejemplo SQLite:</b> <code>DROP INDEX nombre_del_indice;</code>
        `;
    }
    if (/\b(enum|set|mediumint|tinyint|double|real|float|decimal|datetime|year|timestamp|tinytext|mediumtext|longtext|tinyblob|mediumblob|longblob)\b/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> Estás usando un tipo de dato específico de MySQL.<br>
            <b>Diferencia:</b> SQLite solo reconoce <code>INTEGER</code>, <code>TEXT</code>, <code>REAL</code>, <code>BLOB</code> y <code>NUMERIC</code>.<br>
            <b>¿Qué hacer?</b> Sustituye el tipo por uno de esos.<br>
            <b>Ejemplo:</b> <code>nombre TEXT</code>, <code>cantidad INTEGER</code>, <code>fecha NUMERIC</code>.
        `;
    }
    if (/alter\s+table\s+(if\s+(not\s+)?exists)/i.test(sql)) {
        return `
            <b>Ayuda pedagógica:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE IF EXISTS</code> es de MySQL.<br>
            <b>En SQLite:</b> solo puedes usar <code>IF EXISTS</code> con <code>DROP TABLE</code>.<br>
            <b>¿Qué hacer?</b> Elimina <code>IF EXISTS</code> de tus sentencias <code>ALTER TABLE</code>.
        `;
    }
    return "";
}
