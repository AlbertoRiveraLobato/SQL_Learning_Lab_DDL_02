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

// Pegar código de ejemplo 1 en el área de texto (NO ejecuta nada)
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
// ----------------- AYUDA PEDAGÓGICA SOBRE ERRORES SQL -------------------

function getHelpMessage(sql, errorMsg) {
    // 1. CREATE DATABASE / DROP DATABASE
    if (/^\s*create\s+database/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> El comando <code>CREATE DATABASE</code> es válido en MySQL para crear una nueva base de datos, pero <span style="color:#e65100;"><b>no está soportado en SQLite</b></span>.<br>
            <b>Diferencia:</b> En SQLite, cada archivo es una base de datos y no se gestionan varias bases de datos en la misma conexión.<br>
            <b>¿Cómo solucionarlo?</b> Omite este comando y comienza directamente creando tablas.<br>
            <b>Ejemplo correcto en SQLite:</b><br>
            <code>CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT);</code>
        `;
    }
    if (/^\s*drop\s+database/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>DROP DATABASE</code> elimina una base de datos en MySQL, pero <span style="color:#e65100;"><b>no existe en SQLite</b></span>.<br>
            <b>¿Cómo solucionarlo?</b> Si quieres borrar todo, simplemente elimina el archivo de la base de datos o elimina todas las tablas usando <code>DROP TABLE</code>.<br>
            <b>Ejemplo:</b> <code>DROP TABLE IF EXISTS alumnos;</code>
        `;
    }
    // 2. USE database
    if (/^\s*use\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>USE [database]</code> cambia la base de datos activa en MySQL.<br>
            <span style="color:#e65100;"><b>En SQLite no existe este comando</b></span> porque sólo puedes trabajar con una base de datos a la vez.<br>
            <b>¿Qué hacer?</b> Elimina el comando y sigue creando o usando tus tablas directamente.
        `;
    }
    // 3. ENGINE=, CHARSET=, COLLATE=
    if (/engine\s*=/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>ENGINE=...</code> define el motor de almacenamiento en MySQL, como InnoDB o MyISAM.<br>
            <span style="color:#e65100;"><b>SQLite no permite definir motores</b></span>, sólo usa el suyo propio.<br>
            <b>¿Cómo solucionarlo?</b> Elimina <code>ENGINE=...</code> de tu sentencia.<br>
            <b>Ejemplo en SQLite:</b><br>
            <code>CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT);</code>
        `;
    }
    if (/charset\s*=/i.test(sql) || /collate\s*=/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>CHARSET</code> y <code>COLLATE</code> configuran codificación y ordenación de texto en MySQL.<br>
            <span style="color:#e65100;"><b>SQLite usa UTF-8 por defecto</b></span> y no permite definir estos atributos en CREATE TABLE.<br>
            <b>¿Qué hacer?</b> Elimina estas opciones de tu SQL.
        `;
    }
    // 4. AUTO_INCREMENT
    if (/auto_increment/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>AUTO_INCREMENT</code> genera un contador automático en MySQL.<br>
            <span style="color:#e65100;"><b>En SQLite se usa</b></span> <code>INTEGER PRIMARY KEY AUTOINCREMENT</code>.<br>
            <b>Corrige así:</b><br>
            <code>id INTEGER PRIMARY KEY AUTOINCREMENT</code><br>
            <b>Ejemplo MySQL:</b> <code>id INT AUTO_INCREMENT PRIMARY KEY</code><br>
            <b>Ejemplo SQLite:</b> <code>id INTEGER PRIMARY KEY AUTOINCREMENT</code>
        `;
    }
    // 5. UNSIGNED
    if (/unsigned/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>UNSIGNED</code> permite sólo valores positivos en MySQL.<br>
            <span style="color:#e65100;"><b>SQLite no reconoce</b></span> <code>UNSIGNED</code> y todos los enteros pueden ser positivos o negativos.<br>
            <b>¿Qué hacer?</b> Elimina <code>UNSIGNED</code> de tu definición.
        `;
    }
    // 6. ALTER TABLE DROP/MODIFY/CHANGE COLUMN
    if (/alter\s+table\s+\w+\s+drop\s+column/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... DROP COLUMN ...</code> elimina columnas en MySQL.<br>
            <span style="color:#e65100;"><b>SQLite no permite borrar columnas directamente</b></span>.<br>
            <b>¿Cómo solucionarlo?</b><br>
            1. Crea una nueva tabla sin la columna que quieres eliminar.<br>
            2. Copia los datos.<br>
            3. Borra la tabla original.<br>
            4. Renombra la nueva tabla.<br>
            <b>Ejemplo:</b><br>
            <code>CREATE TABLE nueva AS SELECT campo1, campo2 FROM original;</code>
        `;
    }
    if (/alter\s+table\s+\w+\s+modify\s+column/i.test(sql) || /alter\s+table\s+\w+\s+change\s+column/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... MODIFY/CHANGE COLUMN ...</code> cambia tipo o restricciones en MySQL.<br>
            <span style="color:#e65100;"><b>En SQLite no está permitido</b></span>.<br>
            <b>¿Qué hacer?</b> Crea una nueva tabla con la definición correcta, copia los datos, borra la original y renombra la nueva.
        `;
    }
    // 7. ALTER TABLE ADD PRIMARY KEY/CONSTRAINT/FOREIGN KEY
    if (/alter\s+table\s+\w+\s+add\s+primary\s+key/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... ADD PRIMARY KEY</code> es válido en MySQL.<br>
            <span style="color:#e65100;"><b>En SQLite sólo puedes definir la clave primaria al crear la tabla</b></span>.<br>
            <b>¿Qué hacer?</b> Define la clave primaria al crear la tabla.<br>
            <b>Ejemplo:</b> <code>CREATE TABLE alumnos (id INTEGER PRIMARY KEY, ...);</code>
        `;
    }
    if (/alter\s+table\s+\w+\s+add\s+constraint/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... ADD CONSTRAINT ...</code> sólo se permite en MySQL.<br>
            <span style="color:#e65100;"><b>En SQLite debes definir restricciones (PRIMARY KEY, UNIQUE, FOREIGN KEY, etc.) al crear la tabla</b></span>.<br>
            <b>¿Qué hacer?</b> Si necesitas añadir una restricción, crea una tabla nueva con la restricción y traslada los datos.
        `;
    }
    if (/alter\s+table\s+\w+\s+add\s+foreign\s+key/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE ... ADD FOREIGN KEY ...</code> no está soportado en SQLite.<br>
            <b>¿Qué hacer?</b> Debes definir la clave foránea en el <code>CREATE TABLE</code> original.
        `;
    }
    // 8. DROP INDEX ON
    if (/drop\s+index/i.test(sql) && /on\s+\w+/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>DROP INDEX ... ON ...</code> es la sintaxis de MySQL.<br>
            <span style="color:#e65100;"><b>En SQLite sólo debes poner el nombre del índice</b></span>.<br>
            <b>Ejemplo en SQLite:</b> <code>DROP INDEX nombre_del_indice;</code>
        `;
    }
    // 9. Tipos de datos específicos MySQL
    if (/\b(enum|set|mediumint|tinyint|double|real|float|decimal|datetime|year|timestamp|tinytext|mediumtext|longtext|tinyblob|mediumblob|longblob)\b/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> Estás usando un tipo de dato específico de MySQL.<br>
            <span style="color:#e65100;"><b>SQLite sólo reconoce</b></span> <code>INTEGER</code>, <code>TEXT</code>, <code>REAL</code>, <code>BLOB</code> y <code>NUMERIC</code>.<br>
            <b>¿Qué hacer?</b> Usa uno de estos tipos.<br>
            <b>Ejemplo:</b> <code>nombre TEXT</code>, <code>cantidad INTEGER</code>, <code>fecha NUMERIC</code>.
        `;
    }
    // 10. IF EXISTS/IF NOT EXISTS en ALTER TABLE
    if (/alter\s+table\s+(if\s+(not\s+)?exists)/i.test(sql)) {
        return `
            <b>Ayuda:</b><br>
            <b>¿Por qué este error?</b> <code>ALTER TABLE IF EXISTS</code> es válido en MySQL.<br>
            <b>En SQLite:</b> sólo puedes usar <code>IF EXISTS</code> con <code>DROP TABLE</code>.<br>
            <b>¿Qué hacer?</b> Elimina <code>IF EXISTS</code> de <code>ALTER TABLE</code>.
        `;
    }
    // Puedes añadir aquí más patrones si detectas otros errores frecuentes

    // Si no se detecta nada especial, no añade ayuda extra
    return "";
}
