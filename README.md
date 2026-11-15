# Arcadia · Arcade Games

Portal en español con diez minijuegos, favoritos y récords guardados en el navegador.

## Juegos

- **Escuadrón Galáctico**: juego original inspirado en Galaga, con formaciones, enemigos en picada, disparos, vidas y oleadas.
- **Invasores Cósmicos**: formación descendente, barreras destructibles y dificultad progresiva.
- **Neón Breaker**: rompebloques con rebotes según la posición de la paleta, vidas y niveles.
- **Pong Club**: duelo contra la computadora, al primero que llegue a siete puntos.
- Snake, 2048, Memoria, Buscaminas, Tres en raya y Reflejos.

Los gráficos y sonidos de los juegos retro se generan con código propio. No requiere ROMs, cuentas de jugadores, bases de datos ni claves de API. Cada visitante conserva sus récords y favoritos en su propio navegador. Son partidas individuales; compartir el enlace no crea salas multijugador.

## Ejecutar en tu computadora

Con Node.js instalado:

```powershell
cd C:\Users\ZenBook\Documents\GitHub\Arcade-Games
npm start
```

Abre http://127.0.0.1:8766. No hace falta instalar dependencias.

## Desplegar en Vercel

1. Sube los archivos de esta carpeta a tu repositorio de GitHub.
2. En Vercel selecciona **Add New → Project** e importa el repositorio.
3. Usa **Framework Preset: Other**, directorio raíz del repositorio, sin comando de compilación y **Output Directory: public**.
4. Pulsa **Deploy**. `vercel.json` ya declara la configuración del sitio estático.

También puedes usar la CLI de Vercel desde esta carpeta con `npx vercel` y, cuando hayas revisado la vista previa, `npx vercel --prod`.

Documentación oficial: https://vercel.com/docs/builds y https://vercel.com/docs/project-configuration/vercel-json

## Controles retro

| Juego | Teclado | Ratón / pantalla táctil |
| --- | --- | --- |
| Escuadrón e Invasores | Flechas o A/D; mantener Espacio para disparar | Arrastrar desde cualquier punto para mover sin saltos; disparo al mantener el dedo apoyado |
| Neón Breaker | Flechas o A/D | Mover ratón o arrastrar la paleta |
| Pong Club | Flechas arriba/abajo o W/S | Mover ratón o arrastrar verticalmente |

Toca y arrastra sobre el tablero para iniciar. En computadora, enfoca el tablero y usa el teclado. **P** o **Pausar** detiene una partida retro. Tocar el tablero permite continuar. Se pausa automáticamente al cambiar de ventana. El sonido está apagado inicialmente y se activa con el botón **Sonido**. **Reiniciar** comienza otra partida.

Snake reconoce deslizamientos continuos en las cuatro direcciones, incluso sin levantar el dedo, y conserva hasta dos giros rápidos. 2048 realiza un movimiento por deslizamiento. En Buscaminas elige **Descubrir** o activa **Banderas** para marcar y desmarcar con un toque. El botón indica ON/OFF y el tablero cambia de color según el modo. También puedes mantener pulsado medio segundo, usar clic derecho o F sobre una casilla. Un arrastre cancela la selección; cambiar de modo cancela cualquier pulsación pendiente. Al reiniciar vuelve a Descubrir. Los controles direccionales y de disparo en pantalla se sustituyeron por gestos; se mantienen pausa, reinicio y sonido.

Reflejos acepta las teclas que recibe el navegador, incluido Espacio aunque el foco esté en un botón. Escape cierra el juego. Mantener una tecla pulsada no repite la acción.

## Iconos SVG

La interfaz utiliza una selección de 30 iconos de **Lucide 0.468.0**, colección disponible en [All SVG Icons](https://allsvgicons.com/pack/lucide/). Se guardan localmente en `public/icons.js`: no requieren CDN, fuentes de iconos ni solicitudes externas durante el juego. Los sprites originales de los juegos arcade se conservan.

Fuente de los SVG: [lucide-icons/lucide](https://github.com/lucide-icons/lucide/tree/0.468.0). La licencia original ISC y los avisos de copyright están en `public/licenses/lucide.txt`. Los iconos decorativos llevan `aria-hidden`; los controles mantienen etiquetas accesibles en español.

## Poderes de las naves

En Escuadrón Galáctico e Invasores Cósmicos cae una cápsula cada cuatro enemigos destruidos. Recógela con la nave; no hace falta pulsar otro botón.

- **T · Triple:** tres proyectiles en abanico.
- **R · Ráfaga:** disparo doble con mayor cadencia.
- **L · Láser:** atraviesa hasta tres enemigos e inflige doble daño.
- **E · Escudo:** absorbe un impacto.

Los poderes duran 12 segundos y tienen una barra de tiempo dentro del tablero. Una nueva arma sustituye a la anterior; recoger la misma renueva su duración. El escudo se combina con cualquier arma. La pausa detiene los temporizadores y las cápsulas; cambiar de oleada conserva las mejoras. Perder una vida elimina las mejoras activas y reiniciar comienza sin poderes.

## Vista de juego

Los diez juegos se abren ocupando toda la ventana. Las descripciones y ayudas no aparecen durante la partida. Una barra compacta permite cerrar, reiniciar, pausar y activar sonido, según el juego. Los tableros se adaptan a la superficie disponible; los canvas se amplían sin recorte ni deformación. La rotación o los cambios de tamaño conservan la partida.

Se solicita pantalla completa nativa cuando el navegador la permite. Si no está disponible (por ejemplo, en algunas versiones de Safari de iPhone), el juego ocupa toda el área visible de la página; las barras del navegador pueden permanecer. No se bloquea la orientación ni el zoom del navegador.

## Estructura

```text
public/           HTML, CSS, JavaScript e icono que sirve Vercel
  app.js          Catálogo, favoritos, récords y los seis juegos iniciales
  screen.js       Pantalla de juego completa y ajuste al espacio disponible
  game-screen.css Vista inmersiva y controles compactos
  icons.js/css    Iconos SVG locales y estilos compartidos
  licenses/       Licencia de la colección Lucide
  input.js        Gestos de un dedo, con captura y cancelación
  mines.js        Buscaminas con pulsación prolongada y primera jugada segura
  mines.css       Tablero, colores de números y selector de banderas
  snake.js        Snake con cola de giros y controles táctiles
  powerups.js     Cápsulas, armas temporales y escudo de las naves
  retro.js        Motor y cuatro juegos arcade nuevos
scripts/serve.cjs  Servidor local sin dependencias
tests/            Pruebas de las reglas y del ciclo de vida de los juegos
vercel.json       Configuración del despliegue estático
```

Ejecuta `npm run check` y `npm test` para validar. Las fuentes de Google son opcionales: el diseño utiliza fuentes de sistema si no se pueden cargar.

La versión alojada anteriormente en Sites sigue siendo independiente. Esta carpeta es la fuente preparada para Vercel; editarla no actualiza automáticamente ese enlace anterior.
