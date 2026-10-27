# Mesa azul: prueba antes de publicar

Demo local con bots: mesa de lona azul y madera, cartas ilustradas originales,
asientos en cruz y cartas propias grandes. No incorpora servidor multijugador.
Los botones del lobby abren prácticas; no modifica pagos ni acredita monedas.

## Probar

```sh
python -m http.server 8765 --directory dist
```

Abrir `http://localhost:8765/?mesa=1` (o `PROBAR.html` tras descomprimir el ZIP). El botón Ensayar permite probar Tengo flor,
Me envidan, Envidar a rivales bajos y Matar tapado. Cada ensayo reinicia su marcador.

- Orden: tú → rival derecho → compañero enfrente → rival izquierdo. El mano
  rota en cada reparto y el ganador de la baza inicia la siguiente.
- Las cartas jugadas permanecen en su asiento, superpuestas dejando visible
  los valores de las anteriores. Matar tapado coloca la segunda debajo de la tercera,
  oculta hasta la terminación de la mano (puede ser un embuste). Se conservan
  los mismos nodos de cartas y vira
  durante los turnos y cantos: no se reconstruye la mesa ni se reaniman cartas.
- Bots con espera de 3–6 segundos; Prueba rápida reduce la espera. El jugador
  humano no tiene límite para responder. Las cartas esperan los cantos.
- Envido y Truco disponibles desde el primer turno. Una flor ajena sin cantar
  no bloquea el botón Envido. Con flor propia, Envido ofrece declarar la ley;
  Flor y Truco primero resuelve la flor y luego solicita el Truco.
- El envite llega a ambos contrarios: cualquiera acepta por el equipo; solo
  dos No quiero rechazan. Esta es la variante solicitada por el propietario.
  Los cantos se ven junto al jugador y en el aviso central, con las respuestas
  individuales. Los tantos de Envite, Flor y Truco quedan pendientes: solo se
  anotan juntos al cerrar la mano, sin duplicar cobros. El recibo del canto
  espera Continuar. Los marcadores quedan en esquinas de la mesa.
- Flor se canta explícitamente. A ley y A ley o sin ley reservan la flor antes
  de la primera carta; se canta antes de la segunda, de cantar Truco o de
  aceptarlo. El pie debe cantarla en la primera. Sin ley declara ausencia de
  flor. Cada jugador responde a la flor, y el recibo informa el pago pendiente.
- Entrada a 12 muestra Fuera/Dentro; victoria a 24. Hasta tres bazas, con pardas
  y cierre anticipado. Las cartas permanecen hasta Siguiente mano; cada nuevo
  reparto baraja las 40 cartas otra vez, con animación del mazo.

- **Matar tapado:** una vez terminada la primera vuelta, el **último jugador
  de la segunda** puede lanzar juntas su segunda y tercera carta; elige qué
  carta esconder abajo y cuál dejar arriba. La oculta puede matar o ser un
  embuste. El motor conserva su valor real sin mostrarlo; cuando termina la
  mano revela la carta y comprueba si superó a las cartas rivales. La tercera
  queda jugada para la última vuelta y no se solicita de nuevo ese jugador.
  Disponible para partida de cuatro; los bots también pueden ensayarlo.

## Reglas incluidas y límites

Jerarquía con vira (Perico/Perica y rey sustituto); Truco 3, Retruco 6, Vale 9 y
Vale juego 24; envite antes de la primera carta propia, dos tantos iniciales,
un tanto al rechazo inicial, subidas de 1 a 24 y desempate por mano. Una flor
interrumpe el envite pendiente; si hay flores rivales se comparan por tres
puntos, sin subidas. Flores de un solo equipo pagan tres por cada flor.

No incluye falta envido, contra flor, reglas especiales de entrada, negociación
completa de envites con ley ni envite intercalado durante respuesta a Truco.
A ley en esta demo reserva la flor; no representa todo el reglamento. Estos
límites aparecen también en Reglas. La prueba no se publica automáticamente.

## Código y verificación

- `dist/truco-engine.js`: turnos, declaraciones, respuestas por equipo y tantos.
- `dist/mesa.js`: actualización incremental de cartas, avisos y temporizadores.
- `dist/mesa.css`: mesa, posiciones, marcadores, vira y adaptación móvil.
- `dist/index.html`: integración con lobby y baraja original.

```sh
node tests/engine.test.cjs
node --check dist/mesa.js
node --check dist/truco-engine.js
# Solo para la prueba de interfaz (no requerido para jugar):
npm install --no-save jsdom
node tests/ui.test.cjs
```

El motor prueba orden hacia la derecha, dos rechazos, aceptación por compañero,
subidas, pagos inmediatos sin duplicados, flor explícita y reserva A ley,
pardas, entrada 12/meta 24 y 100 partidas completas con semilla. La prueba de
interfaz verifica identidad de cartas/vira entre cantos, turnos e historial,
solicitud a ambos compañeros y pago explícito de flor.

Rama de revisión: `demo/mesa-azul-cruz`. Revisar antes de fusionar o publicar.

## Pruebas específicas de esta revisión

- Envido aceptado o rechazado: el marcador queda intacto mientras continúa la mano.
- Flor cantada: figura como pendiente; no suma hasta cierre por bazas o ir al mazo.
- El cierre paga primero los pendientes y luego el tanto del Truco; una victoria
  a 24 se determina en el cierre, sin puntuar dos veces.
- Barajado nuevo en cada mano, orden variable y sin cartas repetidas.
- Cartas superpuestas con desplazamiento lateral; no se regeneran al cambiar turnos.
- Ensayar → Matar tapado → seleccionar qué carta tapar: la segunda queda
  completamente oculta por la tercera; se revela al terminar con verdad/embuste.
- `node tests/engine.test.cjs` valida el motor y 100 partidas simuladas.
- `node tests/ui.test.cjs` comprueba el DOM con `jsdom` instalado; debe correrse
  en un entorno que cuente con esa dependencia. Falta revisión visual en móvil.

## Mesa compacta y envites ampliados: revisión actual

- Mesa rectangular más compacta: anchura máxima de 990 px, cartas reducidas
  moderadamente y jugadas escalonadas para minimizar choques.
- Dorso ornamental: selector Azul / Rojo. SVG inspirado en la foto enviada.
  La fotografía no se copia ni se incrusta como textura.
- Mazo grande, manos animadas durante el barajado de cada nueva mano.
- Audio generado por Web Audio: carta, envido, truco, flor, barajar y
  fin de mano. Se puede silenciar. El navegador puede requerir clic
  antes de permitir sonido.
- Envido X tantos: elegir 1 a 24 tantos o Envido la falta.
- Respuestas: Quiero, No quiero, Quiero y tantos más, Quiero y la falta.
- La falta es lo que le falta al equipo delantero para llegar a 24 y
  sustituye los puntos apostados previamente, sin sumarlos.
- Rechazar un envite inicial concede 1 tanto; rechazar una subida
  concede la apuesta anteriormente aceptada.
- El marcador se actualiza solo al finalizar la mano, y cobra el
  Envite/Flor antes del Truco. Si el Envite acaba la partida,
  ya no se anotan los tantos del Truco.

### Validación y límites

- Motor: 100 partidas simuladas, envido fijo, subida, falta, rechazo,
  prioridad de puntos, matar tapado y embuste validados.
- Se comprobó la sintaxis JavaScript, pero faltan pruebas visuales
  completas en navegador y pruebas de interfaz con jsdom.
- Esta demo NO incluye aún todas las reglas y estrategias de Solé:
  algunas reglas de ley, contrapuestas de flor y estrategias siguen
  pendientes. Conserva la variante anterior solicitada de dos
  respuestas No quiero para rechazar en equipo, aunque la primera
  respuesta válida en Solé sigue pendiente de conciliación.
- No incorpora jugadores en línea ni integra cuentas reales.
