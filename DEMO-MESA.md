# Mesa azul: prueba antes de publicar

Esta rama reemplaza la antigua mano aleatoria por una demo local de Truco.
No modifica pagos ni acredita monedas: los botones del lobby abren prácticas.

## Probar

Desde la raíz del proyecto:

```sh
python -m http.server 8765 --directory dist
```

Abrir `http://localhost:8765/?mesa=1` para cuatro jugadores. El lobby conserva
las entradas individuales y por parejas. Se juega contra bots en el navegador;
esta rama no incorpora servidor multijugador ni sincronización entre usuarios.

- Tú abajo, compañero enfrente, rivales a los lados.
- Elegir una carta en el turno propio. Las cartas jugadas se acumulan en cada
  asiento con desplazamiento, dejando identificable la primera.
- Los bots esperan de 3 a 6 segundos; «Prueba rápida» reduce la espera.
- Las cartas se bloquean fuera de turno y mientras hay un canto pendiente.
- El resultado conserva las cartas hasta pulsar «Siguiente mano».
- El marcador continúa entre manos. Entrada a 12: etiqueta Fuera/Dentro;
  victoria al alcanzar 24. La mano rota cada reparto.

## Reglas incluidas y límites

Jerarquía por vira (Perico/Perica y sustitución por rey), dos o tres bazas,
pardas, ganador abre la siguiente baza; Truco 3, Retruco 6, Vale 9 y Vale juego
24, aceptación, rechazo y subidas alternas. Envite antes de la primera carta
propia, dos tantos iniciales y «quiero y tantas más» con cantidad de 1 a 24;
desempate por cercanía a la mano. El envite se anota antes del truco al cerrar
la mano. Las flores se reconocen automáticamente y se comparan sin subidas.

La entrada a 12 solamente cambia el estado del marcador en esta prueba. No
incorpora falta envido, contra flor, ni reglas especiales de puntuación por
entrada. No permite intercalar un envite mientras se responde un truco.
Estos límites también están visibles en «Reglas de prueba».

Referencia funcional consultada: https://www.ludoteka.com/juegos/truco-venezolano/reglas
La configuración solicitada por el propietario es la referencia para 12/24.

## Archivos

- `dist/truco-engine.js`: estado y reglas, sin dependencia de la interfaz.
- `dist/mesa.js`: posiciones, controles, animación y temporizadores cancelables.
- `dist/mesa.css`: lona azul, madera y adaptación de pantalla.
- `dist/index.html`: integración con lobby y baraja ilustrada existente.

## Verificación

```sh
node tests/engine.test.cjs
node --check dist/mesa.js
node --check dist/truco-engine.js
```

Pruebas de turnos inválidos, bloqueo por cantos, jerarquía y piezas, envite,
subidas/rechazos, combinaciones de pardas, cierre en segunda baza, rotación,
continuidad de marcador, umbrales 12/24 y 100 partidas completas con semilla.

La rama requiere revisión antes de fusionar o actualizar el Worker publicado.
