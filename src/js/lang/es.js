(function() {
  'use strict';
  angular
    .module('bd.lang')

    .config(function ($translateProvider) {
      $translateProvider.translations('es', {
        NO: 'No',
        YES: 'Si',
        TRACK: 'Pista',
        INSTRUMENT_PREFERENCES: 'Preferencias del instrumento',
        VOLUME_PREFERENCES: 'Preferencias del Volumen',
        VOLUME_PREFERENCES_DESC: 'El canal de entrada puede ser usado para tocar y visualizar la señal del audio',
        SPEED: 'Velocidad',
        MODE: 'Modo',
        SECTION_MODE: 'Modo de sección',
        SECTION_MODE_DESC1: 'Crear y editar secciones',
        SECTION_MODE_DESC2: 'Deslizamiento horizontal',
        PLAYLIST_MODE: 'Modo de lista de reproduccion',
        PLAYLIST_MODE_DESC1: 'Reproduccion de multiples secciones',
        PLAYLIST_MODE_DESC2: 'Deslizamiento vertical',
        SECTION: 'Seccion',
        PLAYLIST: 'Lista de reproduccion',
        PROJECT: 'Proyecto',
        MAIN_MENU: 'Menu Principal',
        NEW: 'Nuevo',
        OPEN: 'Abrir',
        EXPORT: 'Exportar',
        SAVE: 'Guardar',
        SAVE_AS: 'Guardar como',
        DELETE: 'Borrar',
        REMOVE: 'Quitar',
        INPUT_VOLUME: 'Volumen de entrada',
        COUNTDOWN: 'Cuenta regresiva/atras',
        REPEAT: 'Modo de repeticion',
        SCREEN_PLAYBACK: 'Reproduccion de pantalla visible',
        SCREEN_PLAYBACK_DESC: 'Reproducir solo el area visible en la pantalla',
        SELECTION_PLAYBACK: 'Reproduccion de seleccion',
        SELECTION_PLAYBACK_DESC: 'Seleccionar el rango visible para la reproduccion',
        ACTIVE_BARS: 'Barras activas',
        ACTIVE_SECTIONS: 'Secciones activas',
        IMPORT_PROJECT_DESC: 'Arrastrar archivo de proyecto para importar el proyecto',
        CONFIRM_DELETE_PROJECT: '¿Está seguro de borrar el proyecto?',
        SIGNAL_VISUALIZATION: 'Visualizacion de la señal de audio',
        SIGNAL_VISUALIZATION_DESC: 'Visualizacion de la pista de audio o de la señal de entrada durante la reproduccion',
        PROJECT_WEB: 'Pagina de proyecto en Github',
        HELP: 'Ayuda',

        /** Playlist **/
        SECTIONS: 'Secciones',
        CLEAR_ALL: 'Borrar todos',
        MOVE_ALL: 'Mover todos',
        PLAYLIST_INSTRUCTIONS: 'Arrastre los elementos de la lista Secciones a la lista de Reproduccion',

        /** Bass instrument preferences **/
        STRINGS: 'Cuerdas',
        NOTE_LABELS: 'Etiquetas de notas',
        COLORS: 'Colores',
        ENABLED: 'Permitir',
        NAME_AND_FRET: 'Nombre y traste',
        NOTE_NAME: 'Nombre de la nota',
        FRET: 'Traste',

        /** Section preferences **/
        TIME_SIGNATURE: 'Signatura de compas',
        BARS: 'Barras',
        BEATS_PER_SCREEN: 'Latidos por pantalla',
        BEATS_PER_SLIDE: 'Latidos por diapositiva',

        /** Barline context menu **/
        BEAT: 'Pulso',
        BAR: 'Barra',
        SUBDIVISION: 'Subdivision',
        SUBDIVISION_STANDARD: 'Subdivision Normal',
        SUBDIVISION_TRIPLET: 'Subdivision de Trillizos',
        COPY: 'Copie',
        PASTE: 'Pege',
        CLEAR: 'Borrar',

        /** Bass Sound Properties **/
        PLAYING_STYLE: 'Estilo',
        MUSIC_NOTE: 'Nota',
        NOTE_PITCH: 'Tono',
        NOTE_LENGTH: 'Duracion',
        DOTTED_NOTE: 'Con Puntillo',
        STACCATO_NOTE: 'Nota Staccato',
        SLIDE_TO: 'Deslizar hasta',
        SLIDE_TIMING: 'Tiempo de deslize',
        BEND_GRAPH: 'Curva grafica',
        VOLUME: 'Volumen',
        PLAY: 'Tocar',
        FRETS: 'Traste',

        /** Playing styles **/
        FINGER: 'Dedos',
        SLAP: 'Slap',
        POP: 'Pop',
        PICK: 'Púa',
        TAP: 'Golpetear',
        HAMMER_ON: 'Hammer-on (Ligado ascendente)',
        PULL_OFF: 'Pull off (Ligado descendente)',
        LET_RING: 'Deja que suene',

        /** Note types **/
        REGULAR: 'Normal',
        GHOST: 'Muteada',
        SLIDE: 'Deslice',
        GRACE: 'Nota de gracia',
        BEND: 'Doblar',

        /** Note lengths **/
        WHOLE: 'Redonda',
        HALF: 'Blanca',
        QUARTER: 'Negra',
        EIGHTH: 'Corchea',
        SIXTEENTH: 'Semicorchea',

        FRETBOARD: 'Diapasón',
        LAYOUT: 'Disposición',
        HORIZONTAL_LAYOUT: 'Horizontal',
        VERTICAL_LAYOUT: 'Vertical',
        SCROLL_ANIMATION: 'Animación de desplazamiento (ms)'
      });
    })
})();
