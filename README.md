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

Snake reconoce deslizamientos continuos en las cuatro direcciones, incluso sin levantar el dedo, y conserva hasta dos giros rápidos. 2048 realiza un movimiento por deslizamiento. En Buscaminas toca para descubrir y mantén pulsado medio segundo para marcar una bandera; un arrastre cancela la selección. Los controles direccionales y de disparo en pantalla se sustituyeron por gestos; se mantienen pausa, reinicio y sonido.

## Estructura

```text
public/           HTML, CSS, JavaScript e icono que sirve Vercel
  app.js          Catálogo, favoritos, récords y los seis juegos iniciales
  input.js        Gestos de un dedo, con captura y cancelación
  mines.js        Buscaminas con pulsación prolongada y primera jugada segura
  snake.js        Snake con cola de giros y controles táctiles
  retro.js        Motor y cuatro juegos arcade nuevos
scripts/serve.cjs  Servidor local sin dependencias
tests/            Pruebas de las reglas y del ciclo de vida de los juegos
vercel.json       Configuración del despliegue estático
```

Ejecuta `npm run check` y `npm test` para validar. Las fuentes de Google son opcionales: el diseño utiliza fuentes de sistema si no se pueden cargar.

La versión alojada anteriormente en Sites sigue siendo independiente. Esta carpeta es la fuente preparada para Vercel; editarla no actualiza automáticamente ese enlace anterior.
