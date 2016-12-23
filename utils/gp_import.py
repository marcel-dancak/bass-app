#!/usr/bin/python
# -*- coding: utf-8 -*-
import os
import ipdb
import json

import guitarpro
from guitarpro.base import NoteType, SlapEffect, PitchClass, SlideType
from dotmap import DotMap


NOTE_LENGTHS = {}
for l in [1/16.0, 1/8.0, 1/4.0, 1/2.0, 1]:
    NOTE_LENGTHS[l] = DotMap(
        length=l,
        beatLength=l,
        dotted=False
    )
    dotLength = 1.5 * l
    NOTE_LENGTHS[dotLength] = DotMap(
        length=l,
        beatLength=dotLength,
        dotted=True
    )

def encode_note(pitch):
    return str(pitch).replace('#', unichr(9839).encode('utf-8')).replace('b', unichr(9837).encode('utf-8'))

def convert_track(track, start, end):
    # print track.name
    # print

    bar = track.measures[start - 1]
    # print bar.keySignature
    # print bar.tempo.value
    # print

    barLength = bar.end - bar.start
    beatLength = barLength / bar.timeSignature.numerator

    sounds = []
    iBar = 1
    STRINGS = {string.number: str(PitchClass(string.value)) for string in track.strings}
    print STRINGS
    stringSounds = {}#{string: [] for string in STRINGS.values()}
    prevStringSound = {}
    soundsMap = {}
    while bar.number <= end:
        barBeats = {i: [] for i in range(1, bar.timeSignature.numerator+1)}
        # print "generating bar:", bar.number
        for beat in bar.voices[0].beats:
            #print beat
            for note in beat.notes:
                #print note.effect.ghostNote
                style = 'finger'
                if beat.effect.isSlapEffect:
                    style = {
                        SlapEffect.slapping: 'slap',
                        SlapEffect.popping: 'pop',
                        SlapEffect.tapping: 'tap',
                    } [beat.effect.slapEffect]
                if beat.effect.hasPickStroke:
                    style = 'pick'

                # print vars(note)
                if (note.isTiedNote or note.type == NoteType.tie) and not note.effect.slides:
                    style = 'ring'
                    # ipdb.set_trace()
                    # ipdb.pm()

                noteType = {
                    NoteType.normal: 'regular',
                    NoteType.dead: 'ghost',
                }.get(note.type, 'regular')

                string = STRINGS[note.string]

                pitch = PitchClass(note.realValue)
                octave = divmod(note.realValue, 12)[0] - 1
                noteLength = 1.0 / beat.duration.value

                position = (beat.start - bar.start)
                iBeat = 1 + position / beatLength
                iSubbeat = 1 + (position - beatLength * (iBeat - 1)) / (beatLength / 4)

                # print 'Beat:', iBeat
                # print 'Subbeat:', iSubbeat

                # print '-'
                pitch = encode_note(pitch)
                sound = DotMap({
                    'string': string,
                    'style': style,
                    'volume': 0.75,
                    'note': {
                        'type': noteType,
                        'name': pitch,
                        'octave': octave,
                        'fret': note.value,
                        'code': '{0}{1}'.format(pitch, octave)
                    },
                    'noteLength': {
                        'length': noteLength,
                        'dotted': beat.duration.isDotted,
                        'staccato': note.effect.staccato,
                        'beatLength': noteLength * 1.5 if beat.duration.isDotted else noteLength
                    }
                })
                if noteType == 'ghost':
                    sound.note = DotMap(type='ghost')

                if note.effect.hammer:
                    sound._hammer = True # TODO Pull

                if note.effect.slides:
                    print note.effect.slides
                    #if note.effect.slides[0] == SlideType.legatoSlideTo:
                    slide = note.effect.slides[0]
                    sound.note.type = 'slide'
                    if slide in (SlideType.outDownwards, SlideType.outUpwards, SlideType.intoFromBelow, SlideType.intoFromAbove):
                        if slide in (SlideType.outDownwards, SlideType.intoFromBelow):
                            step = -1 * min(3, sound.note.fret-1)
                        else:
                            step = min(3, 24-sound.note.fret)
                        slideNoteVal = note.realValue+step
                        slidePitch = PitchClass(slideNoteVal)
                        slideNote = DotMap(
                            name = encode_note(slidePitch),
                            octave = divmod(slideNoteVal, 12)[0] - 1,
                            fret = sound.note.fret+step
                        )
                        slideNote.code = '{0}{1}'.format(slideNote.name, slideNote.octave)
                        sound.note.slide.endNote = slideNote

                        if slide in (SlideType.intoFromAbove, SlideType.intoFromBelow):
                            copy = slideNote.copy()
                            for attr in ('name', 'octave', 'code', 'fret'):
                                slideNote[attr] = sound.note[attr]
                                sound.note[attr] = copy[attr]


                print sound.note.code, note.string
                if style == 'ring':
                    prevSound = prevStringSound[note.string]
                    sound.note.name = prevSound.note.name
                    sound.note.octave = prevSound.note.octave
                    sound.note.code = prevSound.note.code
                    sound.note.fret = prevSound.note.fret
                    # if iBeat == 3 and note.realValue == 64:
                    #     ipdb.set_trace()
                    #     ipdb.pm()


                # fix piano unique string name
                if track.channel.instrument == 0:
                   sound.string = sound.note.code

                # if sound.note.code == 'B1':
                #     ipdb.set_trace()
                #     ipdb.pm()
                # print sound

                barBeats[iBeat].append(DotMap({
                    'subbeat': iSubbeat,
                    'sound': sound
                }))

                prevStringSound[note.string] = sound
                if sound.string not in stringSounds:
                    stringSounds[sound.string] = []
                
                stringSounds[sound.string].append(sound)
                # print sound.toDict()
                #key = ':'.join(map(str, [iBar, iBeat, iSubbeat, sound.string]))

                key = '{0}:{1}:{2}:{3}'.format(iBar, iBeat, iSubbeat, sound.string)
                #print key
                if key in soundsMap:
                    raise KeyError(key)

                soundsMap[key] = sound

        #print barBeats
        for iBeat, beatSounds in barBeats.iteritems():
            if beatSounds:
                sounds.append(DotMap({
                    'bar': iBar,
                    'beat': iBeat,
                    'subdivision': 4,
                    'data': beatSounds
                }))
        bar = track.measures[start + iBar - 1]
        iBar += 1


    ## Sounds post-processing ##
    print "========================"
    obsolete = []
    for beat_sounds in sounds:
        # print 'Bar:', beat_sounds.bar, 'Beat:', beat_sounds.beat
        for item in beat_sounds.data:
            sound = item.sound
            if sound.note is None:
                obsolete.append((beat_sounds.data, item))
            elif sound._hammer:
                del sound._hammer
                index = stringSounds[sound.string].index(sound)
                next = stringSounds[sound.string][index+1]
                next.style = 'hammer'
                key = soundsMap.keys()[soundsMap.values().index(next)]
                iBar, iBeat, iSubbeat = map(int, key.split(':')[:3])
                sound.next = {
                    'bar': iBar,
                    'beat': iBeat,
                    'subbeat': iSubbeat,
                    'string': sound.string
                }
                next.prev = {
                    'bar': beat_sounds.bar,
                    'beat': beat_sounds.beat,
                    'subbeat': item.subbeat,
                    'string': sound.string
                }
            elif sound.style == 'ring':
                index = stringSounds[sound.string].index(sound)
                prev = stringSounds[sound.string][index-1]

                # print '\nRING:\n'
                # print sound.toDict()
                # print 'prev:', prev.toDict()

                if not prev.note:
                    print 'FIND ROOT'
                    prev = prev._prev
                    print prev.toDict()

                prevNote = prev.note.slide.endNote if prev.note.slide else prev.note
                print prevNote
                sound.note.name = prevNote.name
                sound.note.octave = prevNote.octave
                sound.note.code = prevNote.code
                sound.note.fret = prevNote.fret

                prev.next = {
                    'bar': beat_sounds.bar,
                    'beat': beat_sounds.beat,
                    'subbeat': item.subbeat,
                    'string': sound.string
                }

                key = soundsMap.keys()[soundsMap.values().index(prev)]
                iBar, iBeat, iSubbeat = map(int, key.split(':')[:3])
                sound.prev = {
                    'bar': iBar,
                    'beat': iBeat,
                    'subbeat': iSubbeat,
                    'string': sound.string
                }
            elif sound.note.type == 'slide' and not sound.note.slide.endNote:
                index = stringSounds[sound.string].index(sound)
                next = stringSounds[sound.string][index+1]
                sound.note.slide = DotMap(
                    endNote = DotMap(
                        name = next.note.name,
                        octave = next.note.octave,
                        code = next.note.code,
                        fret = next.note.fret
                    )
                )
                length = sound.noteLength.beatLength+next.noteLength.beatLength
                sound.noteLength = NOTE_LENGTHS[length]
                sound.noteLength.staccato = next.noteLength.staccato
                next.note = None
                next._prev = sound
                #print 'SLIDE', sound.note.name, 'to', next.note.name


    for array, item in obsolete:
        array.remove(item)

    return sounds

# 44 - Pedal Hihat (hit)
# 35 - Kick (hit)
# 41 - Tom very low (hit)
# 43 - Tom low (hit)
# 45 - Tom medium (hit)
# 38 - Snare (hit)
# 38 - Snare (rim shot)
# 37 - Snare (side stick)
# 47 - Tom high (hit)
# 48 - Tom very high (hit)
# 51 - Ride (middle)
# 59 - Ride (edge)
# 53 - Ride (bell)
# 42 - Hihat (closed)
# 46 - Hihat (half)
# 46 - Hihat (open)
# 49 - Crash medium (hit)
# 55 - Splash (hit)
# 57 - Crash high (hit)
# 52 - China (hit)
# 56 - Cowbell high (hit)
# 56 - Cowbell medium (hit)
# 56 - Cowbell low (hit)

def convert_percussion(track, start, end):
    bar = track.measures[start - 1]
    barLength = bar.end - bar.start
    beatLength = barLength / bar.timeSignature.numerator

    sounds = []
    iBar = 1
    DRUMS = {
        44: ('hihat', ),
        35: ('kick', ),
        41: ('tom3', ),
        43: ('tom3', ), # Tom low
        45: ('tom2', ), # Tom medium
        38: ('snare', ),
        42: ('hihat', 0.5),
        46: ('hihat-open', 0.5),
        55: ('hihat-open', ),
        49: ('crash', 0.5),
        57: ('crash', ),
        47: ('tom1', ) # Tom high,
    }
    while bar.number <= end:
        barBeats = {i: [] for i in range(1, bar.timeSignature.numerator+1)}
        for beat in bar.voices[0].beats:
            for note in beat.notes:
                position = (beat.start - bar.start)
                iBeat = 1 + position / beatLength
                iSubbeat = 1 + (position - beatLength * (iBeat - 1)) / (beatLength / 4)
                #print iBar, iBeat, iSubbeat, note.value
                # ipdb.set_trace()
                # ipdb.pm()

                drum = DRUMS.get(note.value, 'tom3')
                barBeats[iBeat].append(DotMap({
                    'subbeat': iSubbeat,
                    'volume': drum[1] if len(drum) > 1 else 0.8,
                    'drum': drum[0]
                }))
                if note.value not in DRUMS:
                   print 'Unknown DRUM:', note.value

        for iBeat, beatSounds in barBeats.iteritems():
            if beatSounds:
                sounds.append(DotMap({
                    'bar': iBar,
                    'beat': iBeat,
                    'subdivision': 4,
                    'data': beatSounds
                }))
        bar = track.measures[start + iBar - 1]
        iBar += 1

    return sounds

def convert(song, tracks, start, end, name):
    track = song.tracks[0]
    bar = track.measures[start - 1]

    section = {
        'name': name,
        'timeSignature': {
            'top': bar.timeSignature.numerator,
            'bottom': bar.timeSignature.denominator.value
        },
        'length': 1+end-start,
        'bpm': bar.tempo.value,
        'beatsPerView': 8,
        'beatsPerSlide': 1,
        'animationDuration': 300,
        'tracks': {}
    }
    for track_id, index in tracks.iteritems():
        track = song.tracks[index]
        if track.isPercussionTrack:
            track_data = convert_percussion(track, start, end)
        else:
            track_data = convert_track(track, start, end)
        section['tracks'][track_id] = track_data

    return section


filename = 'leon.gp5'
song = guitarpro.parse(filename)

for track in song.tracks:
    print track.name, track.channel.instrument
print '------------------'

# cantos.gp5
tracks = {
    # 'bass_0': 0,
    'drums_0': 1,
    # 'piano_0': 2
}

# data = convert(song, tracks, 5, 8, 'Test')
# with open('test.json', 'w') as f:
#     json.dump(data, f, indent=2)

# gloria.gp5
# tracks = {
#     'drums_0': 0,
#     'bass_0': 3,
#     'piano_0': 1
# }

# leon.gp5
tracks = {
    'drums_0': 4,
    'bass_0': 5,
    'piano_0': 2
}

# 1-9
# 10-17
# 18-25
# 26-34
project = os.path.splitext(filename)[0]
data = convert(song, tracks, 35, 42, project.title())
with open('{0}.json'.format(project), 'w') as f:
    json.dump(data, f, indent=2)