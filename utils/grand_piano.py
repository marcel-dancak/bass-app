#!/usr/bin/python

import os
import subprocess


src_dir = './SalamanderGrandPianoV3_OggVorbis/ogg'
dest_dir = './GrandPianoV3'


notes = 'C C# D D# E F F# G G# A A# B'.split()
flat_notes = 'C Db D Eb E F Gb G Ab A Bb B'.split()

base_notes = ['A', 'C', 'D#', 'F#']
# A -> G#
# A -> A#
# C -> B
# C -> C#
# D# -> D
# D# -> E
# F# -> F
# F# -> G

def flat(note):
	return flat_notes[notes.index(note)]

length = '7'
for note in base_notes:
	prev = notes[notes.index(note)-1]
	next = notes[notes.index(note)+1]
	for octave in range(1, 8):
		prev_octave = octave - 1
		src = os.path.join(src_dir, '{0}{1}v12.ogg'.format(note, octave))
		dest = os.path.join(dest_dir, '{0}{1}.ogg'.format(flat(note), octave))
		print 'sox', src, '-C 7.4', dest, 'pitch', 0
		subprocess.call(['sox', src, '-C', '7.4', dest, 'pitch', '0', 'trim', '0', length])

		prev_octave = octave-1 if note == 'C' else octave
		dest = os.path.join(dest_dir, '{0}{1}.ogg'.format(flat(prev), prev_octave))
		print 'sox', src, '-C 7.4', dest, 'pitch', -100
		subprocess.call(['sox', src, '-C', '7.4', dest, 'pitch', '-100', 'trim', '0', length])

		
		dest = os.path.join(dest_dir, '{0}{1}.ogg'.format(flat(next), octave))
		print 'sox', src, '-C 7.4', dest, 'pitch', 100
		subprocess.call(['sox', src, '-C', '7.4', dest, 'pitch', '100', 'trim', '0', length])
		print
