/* ══════════════════════════════════════════════════════════════
   QUIZMUNDO — game.js
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ── CONFIGURACIÓN ────────────────────────────────────────── */
const CONFIG = {
  preguntas_por_partida: 20,
  tiempo_total:          50,   // segundos para las 20 preguntas
  pts_correcta:          50,
  pts_incorrecta:        0,
  delay_siguiente:       800,  // ms antes de pasar a la siguiente pregunta
};

const MUNDOS = [
  { id: 'M1', nombre: 'Geografía',    etapas: ['M1E1','M1E2','M1E3','M1E4','M1E5'] },
  { id: 'M2', nombre: 'Series de TV', etapas: ['M2E1','M2E2','M2E3','M2E4','M2E5'] },
  { id: 'M3', nombre: 'Música',       etapas: ['M3E1','M3E2','M3E3','M3E4','M3E5'] },
  { id: 'M4', nombre: 'Cine',         etapas: ['M4E1','M4E2','M4E3','M4E4','M4E5'] },
  { id: 'M5', nombre: 'Literatura',   etapas: ['M5E1','M5E2','M5E3','M5E4','M5E5'] },
];

/* ── ESTADO GLOBAL ────────────────────────────────────────── */
const estado = {
  musicaOn:  true,
  sonidosOn: true,
  mundoActual:  null,
  etapaActual:  null,
  preguntas:    [],
  preguntaIdx:  0,
  correctas:    0,
  incorrectas:  0,
  puntaje:      0,
  timer:        null,
  tiempoRestante: 0,
  progreso:     {},     // { M1E1: 'completada'|'desbloqueada'|'bloqueada'|'agotada' }
  puntajes:     {},     // { M1E1: mejorPuntaje }
  jugadas:      {},     // { M1E1: 0|1|2 }
};

/* ── AUDIO ────────────────────────────────────────────────── */
const audio = {
  fondo:      document.getElementById('audio-fondo'),
  juego:      document.getElementById('audio-juego'),
  click:      document.getElementById('audio-click'),
  correcto:   document.getElementById('audio-correcto'),
  incorrecto: document.getElementById('audio-incorrecto'),
  tiempo:     document.getElementById('audio-tiempo'),
};

function playClick() {
  if (!estado.sonidosOn) return;
  audio.click.currentTime = 0;
  audio.click.play().catch(() => {});
}

function playEfecto(nombre) {
  if (!estado.sonidosOn) return;
  audio[nombre].currentTime = 0;
  audio[nombre].play().catch(() => {});
}

function iniciarMusicaFondo() {
  if (!estado.musicaOn) return;
  audio.juego.pause();
  audio.fondo.currentTime = 0;
  audio.fondo.play().catch(() => {});
}

function iniciarMusicaJuego() {
  if (!estado.musicaOn) return;
  audio.fondo.pause();
  audio.juego.currentTime = 0;
  audio.juego.play().catch(() => {});
}

function detenerTodaMusica() {
  audio.fondo.pause();
  audio.juego.pause();
}

/* ── PERSISTENCIA ─────────────────────────────────────────── */
function guardarDatos() {
  localStorage.setItem('qm_progreso', JSON.stringify(estado.progreso));
  localStorage.setItem('qm_puntajes', JSON.stringify(estado.puntajes));
  localStorage.setItem('qm_jugadas',  JSON.stringify(estado.jugadas));
  localStorage.setItem('qm_musica',   JSON.stringify(estado.musicaOn));
  localStorage.setItem('qm_sonidos',  JSON.stringify(estado.sonidosOn));
}

function cargarDatos() {
  const m = localStorage.getItem('qm_musica');
  const s = localStorage.getItem('qm_sonidos');
  if (m !== null) estado.musicaOn  = JSON.parse(m);
  if (s !== null) estado.sonidosOn = JSON.parse(s);

  const p = localStorage.getItem('qm_puntajes');
  if (p) estado.puntajes = JSON.parse(p);

  const j = localStorage.getItem('qm_jugadas');
  if (j) estado.jugadas = JSON.parse(j);

  const pr = localStorage.getItem('qm_progreso');
  if (pr) {
    estado.progreso = JSON.parse(pr);
  } else {
    MUNDOS.forEach(mundo => {
      mundo.etapas.forEach((etapa, i) => {
        estado.progreso[etapa] = i === 0 ? 'desbloqueada' : 'bloqueada';
      });
    });
    guardarDatos();
  }
}

/* ── UTILIDADES ───────────────────────────────────────────── */
function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── PARSEO DE DATOS ──────────────────────────────────────── */
function parsearEtapa(clave) {
  const raw = DATOS_ES[clave];
  if (!raw) return null;

  const lineas = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const res = { titulo: '', instruccion: '', encabezado: ['',''], pares: [] };
  let seccion = '';

  for (const linea of lineas) {
    if (linea.startsWith('#TITULO') || linea.startsWith('#TÍTULO'))       { seccion = 'titulo';      continue; }
    if (linea.startsWith('#INSTRUCCION') || linea.startsWith('#INSTRUCCIÓN')) { seccion = 'instruccion'; continue; }
    if (linea.startsWith('#ENCABEZADO'))  { seccion = 'encabezado'; continue; }
    if (linea.startsWith('#DATOS'))       { seccion = 'datos';      continue; }

    if (seccion === 'titulo')      res.titulo      = linea;
    if (seccion === 'instruccion') res.instruccion = linea;
    if (seccion === 'encabezado')  res.encabezado  = linea.split('|');
    if (seccion === 'datos') {
      const partes = linea.split('|');
      if (partes.length === 2) res.pares.push({ concepto: partes[0].trim(), respuesta: partes[1].trim() });
    }
  }
  return res;
}

/* ══════════════════════════════════════════════════════════════
   PANTALLA 1 — INICIO
   ══════════════════════════════════════════════════════════════ */
document.getElementById('btn-iniciar-juego').addEventListener('click', () => {
  playClick();
  iniciarMusicaFondo();
  mostrarPantalla(2);
});


/* ══════════════════════════════════════════════════════════════
   PANTALLA 2 — MENÚ PRINCIPAL
   ══════════════════════════════════════════════════════════════ */
document.getElementById('btn-jugar').addEventListener('click', () => {
  playClick();
  actualizarProgresoMundos();
  mostrarPantalla(3);
});

document.getElementById('btn-puntajes').addEventListener('click', () => {
  playClick();
  renderizarPantalla5();
  mostrarPantalla(5);
});

document.getElementById('btn-estadisticas').addEventListener('click', () => {
  playClick();
  renderizarPantalla8();
  mostrarPantalla(8);
});

document.getElementById('btn-salir-p2').addEventListener('click', () => {
  playClick();
  mostrarPantalla(1);
});

function todasJugadasAlMenosUnaVez() {
  return MUNDOS.every(mundo =>
    mundo.etapas.every(e => {
      const jugadas = estado.jugadas[e] || 0;
      const prog    = estado.progreso[e];
      // Cuenta como jugada si tiene registro en jugadas,
      // O si el progreso indica que fue completada/agotada
      return jugadas >= 1 || prog === 'completada' || prog === 'agotada';
    })
  );
}

function actualizarBotonEstadisticas() {
  const btn = document.getElementById('btn-estadisticas');
  btn.disabled = !todasJugadasAlMenosUnaVez();
}


/* ══════════════════════════════════════════════════════════════
   PANTALLA 8 — ESTADÍSTICAS
   ══════════════════════════════════════════════════════════════ */

function renderizarPantalla8() {
  const contenedor = document.getElementById('p8-grafico');
  contenedor.innerHTML = '';

  // Calcular promedio de puntaje por mundo
  const promedios = MUNDOS.map(mundo => {
    const puntajesValidos = mundo.etapas
      .map(e => estado.puntajes[e])
      .filter(p => p !== undefined && p !== null);
    const promedio = puntajesValidos.length > 0
      ? Math.round(puntajesValidos.reduce((a, b) => a + b, 0) / puntajesValidos.length)
      : 0;
    return { nombre: mundo.nombre, promedio };
  });

  const maxVal = Math.max(...promedios.map(p => p.promedio), 1);

  const ALTURA_MAX = 200; // px

  promedios.forEach((item, i) => {
    const alturaPx = Math.max(Math.round((item.promedio / maxVal) * ALTURA_MAX), 4);
    const iconos   = ['🌍','📺','🎵','🎬','📚'];

    const wrap = document.createElement('div');
    wrap.className = 'p8-barra-wrap';
    wrap.innerHTML = `
      <span class="p8-barra-valor">${item.promedio}</span>
      <div class="p8-barra" style="height: ${alturaPx}px"></div>
      <span class="p8-barra-label">${iconos[i]}</span>
      <span class="p8-barra-sub">${item.nombre}</span>
    `;
    contenedor.appendChild(wrap);
  });
}

document.getElementById('btn-salir-p8').addEventListener('click', () => {
  playClick();
  mostrarPantalla(2);
});


/* ══════════════════════════════════════════════════════════════
   PANTALLA 3 — SELECCIÓN DE MUNDO
   ══════════════════════════════════════════════════════════════ */

document.querySelectorAll('.btn-mundo').forEach(btn => {
  btn.addEventListener('click', () => {
    playClick();
    const idx = parseInt(btn.dataset.mundo);
    estado.mundoActual = MUNDOS[idx];
    renderizarPantalla4();
    mostrarPantalla(4);
  });
});

function actualizarProgresoMundos() {
  document.querySelectorAll('.btn-mundo').forEach(btn => {
    const idx    = parseInt(btn.dataset.mundo);
    const mundo  = MUNDOS[idx];
    const total  = mundo.etapas.length;
    const jugadas = mundo.etapas.filter(e =>
      estado.progreso[e] === 'completada' || estado.progreso[e] === 'agotada'
    ).length;
    const spanProg = btn.querySelector('.btn-mundo-progreso');
    if (spanProg) spanProg.textContent = `${jugadas} / ${total} etapas`;
  });
}

document.getElementById('btn-salir-p3').addEventListener('click', () => {
  playClick();
  mostrarPantalla(2);
});


/* ══════════════════════════════════════════════════════════════
   PANTALLA 4 — SELECCIÓN DE ETAPA
   ══════════════════════════════════════════════════════════════ */

function renderizarPantalla4() {
  const mundo = estado.mundoActual;
  document.getElementById('p4-nombre-mundo').textContent = mundo.nombre;

  const contenedor = document.getElementById('p4-etapas');
  contenedor.innerHTML = '';

  mundo.etapas.forEach((claveEtapa, i) => {
    const estatus = estado.progreso[claveEtapa] || 'bloqueada';
    const pts     = estado.puntajes[claveEtapa];

    const iconos = { desbloqueada: '▶', completada: '✅', bloqueada: '🔒', agotada: '🔒' };
    const badges = {
      desbloqueada: '<span class="btn-etapa-badge badge-disponible">Disponible</span>',
      completada:   '<span class="btn-etapa-badge badge-completada">1 jugada</span>',
      bloqueada:    '<span class="btn-etapa-badge badge-bloqueada">Bloqueada</span>',
      agotada:      '<span class="btn-etapa-badge badge-agotada">Agotada</span>',
    };

    const puntajeTexto = (estatus === 'completada' || estatus === 'agotada') && pts !== undefined
      ? `<span class="btn-etapa-puntaje">${pts} pts</span>`
      : '';

    const btn = document.createElement('button');
    btn.className = `btn-etapa btn-etapa--${estatus === 'agotada' ? 'bloqueada' : estatus}`;
    btn.innerHTML = `
      <span class="btn-etapa-icono">${iconos[estatus]}</span>
      <span class="btn-etapa-info">
        <span class="btn-etapa-nombre">Etapa ${i + 1}</span>
        ${puntajeTexto}
      </span>
      ${badges[estatus]}
    `;

    if (estatus === 'desbloqueada' || estatus === 'completada') {
      btn.addEventListener('click', () => {
        playClick();
        estado.etapaActual = claveEtapa;
        iniciarJuego(claveEtapa);
      });
    }

    contenedor.appendChild(btn);
  });
}

document.getElementById('btn-salir-p4').addEventListener('click', () => {
  playClick();
  actualizarProgresoMundos();
  mostrarPantalla(3);
});


/* ══════════════════════════════════════════════════════════════
   PANTALLA 5 — PUNTAJES
   ══════════════════════════════════════════════════════════════ */

const ICONOS_MUNDO = ['🌍','📺','🎵','🎬','📚'];

function renderizarPantalla5() {
  const contenedor = document.getElementById('p5-mundos');
  contenedor.innerHTML = '';

  MUNDOS.forEach((mundo, mi) => {
    const bloque = document.createElement('div');
    bloque.className = 'p5-mundo-bloque';

    // Header del mundo
    bloque.innerHTML = `
      <div class="p5-mundo-header">
        <span class="p5-mundo-icono">${ICONOS_MUNDO[mi]}</span>
        <span class="p5-mundo-nombre">Mundo ${mi + 1} — ${mundo.nombre}</span>
      </div>
    `;

    // Filas de etapas
    mundo.etapas.forEach((claveEtapa, ei) => {
      const pts = estado.puntajes[claveEtapa];
      const fila = document.createElement('div');
      fila.className = 'p5-etapa-fila';

      const tienePuntaje = pts !== undefined && pts !== null;
      fila.innerHTML = `
        <span class="p5-etapa-nombre">Etapa ${ei + 1}</span>
        <span class="p5-etapa-puntaje ${tienePuntaje ? 'con-puntaje' : 'sin-puntaje'}">
          ${tienePuntaje ? pts + ' pts' : 'Etapa no jugada'}
        </span>
      `;
      bloque.appendChild(fila);
    });

    contenedor.appendChild(bloque);
  });
}

document.getElementById('btn-salir-p5').addEventListener('click', () => {
  playClick();
  mostrarPantalla(2);
});


/* ══════════════════════════════════════════════════════════════
   PANTALLA 6 — JUEGO
   ══════════════════════════════════════════════════════════════ */

/* ── Referencias DOM ──────────────────────────────────────── */
const elNivel        = document.getElementById('p6-nivel');
const elTimerNum     = document.getElementById('p6-timer-num');
const elBarra        = document.getElementById('p6-barra');
const elConceptoLbl  = document.getElementById('p6-concepto-label');
const elConcepto     = document.getElementById('p6-concepto');
const elAlternativas = document.getElementById('p6-alternativas');
const elCorrectasUI  = document.getElementById('p6-correctas');
const elIncorrectasUI= document.getElementById('p6-incorrectas');
const elPuntajeUI    = document.getElementById('p6-puntaje');

const modalInstr     = document.getElementById('modal-instrucciones');
const modalResult    = document.getElementById('modal-resultado');

/* ── Iniciar juego ────────────────────────────────────────── */
function iniciarJuego(claveEtapa) {
  const datos = parsearEtapa(claveEtapa);
  if (!datos) return;

  // Resetear estado de partida
  estado.preguntas      = generarPreguntas(datos);
  estado.preguntaIdx    = 0;
  estado.correctas      = 0;
  estado.incorrectas    = 0;
  estado.puntaje        = 0;
  estado.tiempoRestante = CONFIG.tiempo_total;

  // Nivel en cabecera
  elNivel.textContent = datos.titulo;

  // Mostrar pantalla 6
  mostrarPantalla(6);

  // Mostrar modal de instrucciones
  document.getElementById('modal-instruccion-texto').textContent = datos.instruccion;
  modalInstr.classList.remove('oculto');
  modalResult.classList.add('oculto');

  actualizarMarcador();
}

/* ── Botón OK del modal instrucciones ────────────────────── */
document.getElementById('btn-modal-ok').addEventListener('click', () => {
  modalInstr.classList.add('oculto');
  iniciarMusicaJuego();
  mostrarPregunta();
  iniciarTimer();
});

/* ── Generar preguntas ────────────────────────────────────── */
function generarPreguntas(datos) {
  const todasRespuestas = [...new Set(datos.pares.map(p => p.respuesta))];
  const mezclados = mezclar([...datos.pares]).slice(0, CONFIG.preguntas_por_partida);

  return mezclados.map(par => {
    const correcta     = par.respuesta;
    const distractores = mezclar(todasRespuestas.filter(r => r !== correcta));
    const pool         = [...distractores, ...distractores, ...distractores];
    const opciones     = [correcta, pool[0], pool[1], pool[2]].sort((a, b) => a.localeCompare(b, 'es'));
    return { concepto: par.concepto, correcta, opciones, categoria: datos.encabezado[0] };
  });
}

/* ── Mostrar pregunta ─────────────────────────────────────── */
function mostrarPregunta() {
  const q = estado.preguntas[estado.preguntaIdx];
  elConceptoLbl.textContent = q.categoria;
  elConcepto.textContent    = q.concepto;

  elAlternativas.innerHTML = '';
  q.opciones.forEach(opcion => {
    const btn = document.createElement('button');
    btn.className   = 'btn-alternativa';
    btn.textContent = opcion;
    btn.addEventListener('click', () => responder(btn, opcion, q.correcta));
    elAlternativas.appendChild(btn);
  });
}

/* ── Responder ────────────────────────────────────────────── */
function responder(btn, elegida, correcta) {
  // Bloquear todos los botones
  document.querySelectorAll('.btn-alternativa').forEach(b => b.disabled = true);

  if (elegida === correcta) {
    btn.classList.add('correcta');
    estado.correctas++;
    estado.puntaje += CONFIG.pts_correcta;
    playEfecto('correcto');
  } else {
    btn.classList.add('incorrecta');
    btn.classList.add('shake');
    // Marcar correcta
    document.querySelectorAll('.btn-alternativa').forEach(b => {
      if (b.textContent === correcta) b.classList.add('correcta');
    });
    estado.incorrectas++;
    playEfecto('incorrecto');
  }

  actualizarMarcador();

  setTimeout(() => {
    estado.preguntaIdx++;
    if (estado.preguntaIdx < estado.preguntas.length) {
      mostrarPregunta();
    } else {
      terminarJuego();
    }
  }, CONFIG.delay_siguiente);
}

/* ── Actualizar marcador ──────────────────────────────────── */
function actualizarMarcador() {
  elCorrectasUI.textContent  = `✔ ${estado.correctas}`;
  elIncorrectasUI.textContent= `✘ ${estado.incorrectas}`;
  elPuntajeUI.textContent    = `${estado.puntaje} pts`;
}

/* ── Timer ────────────────────────────────────────────────── */
function iniciarTimer() {
  detenerTimer();
  estado.tiempoRestante = CONFIG.tiempo_total;
  actualizarTimer();

  estado.timer = setInterval(() => {
    estado.tiempoRestante--;
    actualizarTimer();

    // Sonido de cuenta regresiva en los últimos 5 seg
    if (estado.tiempoRestante <= 5 && estado.tiempoRestante > 0) {
      playEfecto('tiempo');
    }

    if (estado.tiempoRestante <= 0) {
      terminarJuego();
    }
  }, 1000);
}

function actualizarTimer() {
  const t   = estado.tiempoRestante;
  const pct = (t / CONFIG.tiempo_total) * 100;
  const urgente = t <= 5;

  elTimerNum.textContent = t;
  elTimerNum.classList.toggle('urgente', urgente);
  elBarra.style.width    = `${pct}%`;
  elBarra.classList.toggle('urgente', urgente);
}

function detenerTimer() {
  if (estado.timer) {
    clearInterval(estado.timer);
    estado.timer = null;
  }
}

/* ── Terminar juego ───────────────────────────────────────── */
function terminarJuego() {
  detenerTimer();
  document.querySelectorAll('.btn-alternativa').forEach(b => b.disabled = true);

  const claveEtapa = estado.etapaActual;
  const mundo      = estado.mundoActual;
  const idx        = mundo.etapas.indexOf(claveEtapa);

  // Contar jugada
  estado.jugadas[claveEtapa] = (estado.jugadas[claveEtapa] || 0) + 1;

  // Guardar mejor puntaje
  const puntajeAnterior = estado.puntajes[claveEtapa] ?? -1;
  if (estado.puntaje > puntajeAnterior) {
    estado.puntajes[claveEtapa] = estado.puntaje;
  }

  // Actualizar progreso
  if (estado.jugadas[claveEtapa] >= 2) {
    // Agotada: bloqueada definitivamente
    estado.progreso[claveEtapa] = 'agotada';
  } else {
    estado.progreso[claveEtapa] = 'completada';
  }

  // Desbloquear siguiente etapa si es la primera vez que se completa
  const siguiente = mundo.etapas[idx + 1];
  if (siguiente && estado.progreso[siguiente] === 'bloqueada') {
    estado.progreso[siguiente] = 'desbloqueada';
  }

  guardarDatos();
  iniciarMusicaFondo();
  actualizarBotonEstadisticas();

  // Modal resultado
  const mundoIdx = MUNDOS.indexOf(mundo);
  document.getElementById('modal-resultado-titulo').textContent =
    `${mundo.nombre} — Etapa ${idx + 1}`;
  document.getElementById('modal-correctas').textContent   = estado.correctas;
  document.getElementById('modal-incorrectas').textContent = estado.incorrectas;
  document.getElementById('modal-puntaje').textContent     = estado.puntaje;

  // Botón SIGUIENTE ETAPA — busca la próxima etapa disponible (no agotada)
  const btnSig = document.getElementById('btn-siguiente-etapa');
  let siguienteEtapaClave = null;

  // Primero busca en el mismo mundo
  for (let i = idx + 1; i < mundo.etapas.length; i++) {
    const e = mundo.etapas[i];
    if (estado.progreso[e] === 'desbloqueada' || estado.progreso[e] === 'completada') {
      siguienteEtapaClave = e;
      break;
    }
  }
  // Si no hay en este mundo, busca en el siguiente
  if (!siguienteEtapaClave) {
    const sigMundoIdx = mundoIdx + 1;
    if (sigMundoIdx < MUNDOS.length) {
      const sigMundo = MUNDOS[sigMundoIdx];
      for (const e of sigMundo.etapas) {
        if (estado.progreso[e] === 'desbloqueada' || estado.progreso[e] === 'completada') {
          siguienteEtapaClave = e;
          break;
        }
      }
    }
  }

  if (siguienteEtapaClave) {
    btnSig.disabled = false;
    btnSig.onclick = () => {
      MUNDOS.forEach(m => {
        if (m.etapas.includes(siguienteEtapaClave)) estado.mundoActual = m;
      });
      estado.etapaActual = siguienteEtapaClave;
      modalResult.classList.add('oculto');
      iniciarJuego(siguienteEtapaClave);
    };
  } else {
    btnSig.disabled = true;
  }

  modalResult.classList.remove('oculto');
}

/* ── Botón STOP ───────────────────────────────────────────── */
document.getElementById('btn-stop').addEventListener('click', () => {
  detenerTimer();
  iniciarMusicaFondo();
  renderizarPantalla4();
  mostrarPantalla(4);
});

/* ── Botón SALIR del modal resultado ─────────────────────── */
document.getElementById('btn-resultado-salir').addEventListener('click', () => {
  playClick();
  modalResult.classList.add('oculto');
  renderizarPantalla4();
  mostrarPantalla(4);
});


/* ══════════════════════════════════════════════════════════════
   OPCIONES — PANTALLA 1 + ÍCONOS FLOTANTES
   ══════════════════════════════════════════════════════════════ */

const iconosFlotantes = document.getElementById('iconos-flotantes');
const iconoSonido     = document.getElementById('icono-sonido');
const iconoMusica     = document.getElementById('icono-musica');

function sincronizarOpciones() {
  // Toggles pantalla 1
  aplicarToggle('toggle-musica-p1',  'label-musica-p1',  estado.musicaOn);
  aplicarToggle('toggle-sonidos-p1', 'label-sonidos-p1', estado.sonidosOn);

  // Íconos flotantes
  iconoMusica.classList.toggle('apagado', !estado.musicaOn);
  iconoSonido.classList.toggle('apagado', !estado.sonidosOn);

  // Íconos en cabecera P6
  const im6 = document.getElementById('icono-musica-p6');
  const is6 = document.getElementById('icono-sonido-p6');
  if (im6) im6.classList.toggle('apagado', !estado.musicaOn);
  if (is6) is6.classList.toggle('apagado', !estado.sonidosOn);
}

function aplicarToggle(btnId, labelId, activo) {
  const btn   = document.getElementById(btnId);
  const label = document.getElementById(labelId);
  if (!btn || !label) return;
  btn.dataset.activo = activo ? 'true' : 'false';
  label.textContent  = activo ? 'ON' : 'OFF';
}

// Toggle música — Pantalla 1
document.getElementById('toggle-musica-p1').addEventListener('click', () => {
  estado.musicaOn = !estado.musicaOn;
  aplicarToggle('toggle-musica-p1', 'label-musica-p1', estado.musicaOn);
  iconoMusica.classList.toggle('apagado', !estado.musicaOn);
  estado.musicaOn ? iniciarMusicaFondo() : detenerTodaMusica();
  guardarDatos();
});

// Toggle sonidos — Pantalla 1
document.getElementById('toggle-sonidos-p1').addEventListener('click', () => {
  estado.sonidosOn = !estado.sonidosOn;
  aplicarToggle('toggle-sonidos-p1', 'label-sonidos-p1', estado.sonidosOn);
  iconoSonido.classList.toggle('apagado', !estado.sonidosOn);
  guardarDatos();
});

// Ícono música flotante
iconoMusica.addEventListener('click', () => {
  estado.musicaOn = !estado.musicaOn;
  iconoMusica.classList.toggle('apagado', !estado.musicaOn);
  aplicarToggle('toggle-musica-p1', 'label-musica-p1', estado.musicaOn);
  estado.musicaOn ? iniciarMusicaFondo() : detenerTodaMusica();
  guardarDatos();
});

// Ícono sonido flotante
iconoSonido.addEventListener('click', () => {
  estado.sonidosOn = !estado.sonidosOn;
  iconoSonido.classList.toggle('apagado', !estado.sonidosOn);
  aplicarToggle('toggle-sonidos-p1', 'label-sonidos-p1', estado.sonidosOn);
  guardarDatos();
});

// Íconos audio en cabecera P6
document.getElementById('icono-musica-p6').addEventListener('click', () => {
  estado.musicaOn = !estado.musicaOn;
  sincronizarOpciones();
  estado.musicaOn ? iniciarMusicaJuego() : detenerTodaMusica();
  guardarDatos();
});

document.getElementById('icono-sonido-p6').addEventListener('click', () => {
  estado.sonidosOn = !estado.sonidosOn;
  sincronizarOpciones();
  guardarDatos();
});

// Mostrar/ocultar íconos flotantes según pantalla
function mostrarPantalla(n) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.getElementById(`pantalla-${n}`).classList.add('activa');
  // Íconos flotantes visibles en pantallas 2-5 y 7, no en 1 ni 6
  iconosFlotantes.classList.toggle('visible', n !== 1 && n !== 6);
  if (n === 2) actualizarBotonEstadisticas();
}


/* ══════════════════════════════════════════════════════════════
   INICIO
   ══════════════════════════════════════════════════════════════ */
cargarDatos();
sincronizarOpciones();
actualizarProgresoMundos();
actualizarBotonEstadisticas();