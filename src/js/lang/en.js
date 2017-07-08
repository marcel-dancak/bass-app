(function() {
  'use strict';
  angular
    .module('bd.lang')

    .config(function ($translateProvider) {
      $translateProvider.translations('en', {
        NO: 'No',
        YES: 'Yes',
        TRACK: 'Track',
        INSTRUMENT_PREFERENCES: 'Instrument preferences',
        VOLUME_PREFERENCES: 'Volume preferences',
        VOLUME_PREFERENCES_DESC: 'Input channel can be used for playing and audio signal visualization',
        SPEED: 'Speed',
        MODE: 'Mode',
        SECTION_MODE: 'Section mode',
        SECTION_MODE_DESC1: 'Creating and editing of sections',
        SECTION_MODE_DESC2: 'Horizontal sliding',
        PLAYLIST_MODE: 'Playlist mode',
        PLAYLIST_MODE_DESC1: 'Playback of multiple sections (playlists)',
        PLAYLIST_MODE_DESC2: 'Vertical sliding',
        SECTION: 'Section',
        PLAYLIST: 'Playlist',
        PROJECT: 'Project',
        MAIN_MENU: 'Main menu',
        NEW: 'New',
        OPEN: 'Open',
        EXPORT: 'Export',
        UPLOAD: 'Upload',
        UPDATE: 'Update',
        SAVE: 'Save',
        SAVE_AS: 'Save As...',
        DELETE: 'Delete',
        REMOVE: 'Remove',
        INPUT_VOLUME: 'Input Channel',
        COUNTDOWN: 'Countdown',
        REPEAT: 'Repeat mode',
        SCREEN_PLAYBACK: 'Visible screen playback',
        SCREEN_PLAYBACK_DESC: 'Play only visible area on the screen (without automatic slides transition)',
        SELECTION_PLAYBACK: 'Selection playback',
        SELECTION_PLAYBACK_DESC: 'Select visible range for playback',
        ACTIVE_BARS: 'Active bars',
        ACTIVE_SECTIONS: 'Active sections',
        IMPORT_PROJECT_DESC: 'Drag project file to import project',
        CONFIRM_DELETE_PROJECT: 'Are you sure to delete project',
        SIGNAL_VISUALIZATION: 'Audio signal visualization',
        SIGNAL_VISUALIZATION_DESC: 'Display audio track or input signal visualization during playback',
        PROJECT_WEB: 'Project page on GitHub',
        HELP: 'Help',

        /** Playlist **/
        SECTIONS: 'Sections',
        CLEAR_ALL: 'Clear all',
        MOVE_ALL: 'Move all',
        PLAYLIST_INSTRUCTIONS: 'Drag items from Sections list into the Playlist',

        /** Bass instrument preferences **/
        STRINGS: 'Strings',
        NOTE_LABELS: 'Notation',
        COLORS: 'Colored notes by octave',
        ENABLED: 'Enabled',
        NAME_AND_FRET: 'Name + Fret',
        NOTE_NAME: 'Name',
        FRET: 'Fret',

        /** Piano instrument preferences **/
        RANGE: 'Range',

        /** Other preferences */
        ZOOM: 'Zoom',

        /** Section preferences **/
        TIME_SIGNATURE: 'Time signature',
        BARS: 'Numer of bars',
        BEATS_PER_SCREEN: 'Beats on screen',
        BEATS_PER_SLIDE: 'Beats per slide',
        BEATS_COUNTING: 'Beats counting',
        CHORDS_EDITOR: 'Chords Editor',

        /** Barline context menu **/
        BEAT: 'Beat',
        BAR: 'Bar',
        SUBDIVISION: 'Subdivision',
        SUBDIVISION_STANDARD: 'Standard',
        SUBDIVISION_TRIPLET: 'Triplet',
        DOUBLE_GRID: 'Double Grid',
        COPY: 'Copy',
        PASTE: 'Paste',
        CLEAR: 'Clear',
        COMMENT: 'Comment',

        /** Bass Sound Properties **/
        PLAYING_STYLE: 'Style',
        MUSIC_NOTE: 'Note',
        NOTE_PITCH: 'Pitch',
        NOTE_LENGTH: 'Length',
        DOTTED_NOTE: 'Dotted',
        STACCATO_NOTE: 'Staccato',
        END_PITCH: 'End pitch',
        SLIDE_TIMING: 'Slide timing',
        BEND_GRAPH: 'Bend graph',
        VOLUME: 'Volume',
        PLAY: 'Play',
        FRETS: 'Frets',

        /** Playing styles **/
        FINGER: 'Finger',
        SLAP: 'Slap',
        POP: 'Pop',
        PICK: 'Pick',
        TAP: 'Tap',
        HAMMER_ON: 'Hammer-On',
        PULL_OFF: 'Pull-Off',
        LET_RING: 'Let ring (Tie)',
        HARMONICS: 'Harmonics',

        /** Note types **/
        REGULAR: 'Regular',
        GHOST: 'Ghost',
        SLIDE: 'Slide',
        GRACE: 'Grace',
        BEND: 'Bend',

        /** Note lengths **/
        WHOLE: 'Whole',
        HALF: 'Half',
        QUARTER: 'Quarter',
        EIGHTH: 'Eighth',
        SIXTEENTH: 'Sixteenth',
        THIRTYSECOND: 'Thirty-second',

        /** Metadata **/
        METADATA: 'Metadata',
        SUBBEAT: 'Subbeat',
        CHORD: 'Chord',
        STRING: 'String',
        ROOT_NOTE: 'Root note',
        BASS_NOTE: 'Bass note',
        TYPE: 'Type',

        FRETBOARD: 'Fretboard',
        LAYOUT: 'Layout',
        HORIZONTAL_LAYOUT: 'Horizontal',
        VERTICAL_LAYOUT: 'Vertical',
        SCROLL_ANIMATION: 'Scroll animation (ms)'
      });
    })
})();
