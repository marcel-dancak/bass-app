#!/usr/bin/python

import os
import subprocess


srcDir = '../sounds/bass/pick/'
destDir = 'tmp'


def generate_higher_frets(strings, startFret=20, frets=[]):
	for string in strings:
		srcSound = os.path.join(
			srcDir,
			'{0}{1}.ogg'.format(string, startFret)
		)
		for fret in frets:
			destSound = os.path.join(
				destDir,
				'{0}{1}.ogg'.format(string, fret)
			)
			pitch = str((fret - startFret) * 100)
			print 'sox', srcSound, '-C 7.4', destSound, 'pitch', pitch
			#subprocess.call(['sox', srcSound, '-C', '7.4', destSound, 'pitch', pitch])


def generate_string(string, fretsRange=(0, 24)):
	strings = 'BEADGC'
	strString = strings[strings.index(string) -1]
	for fret in range(fretsRange[0], fretsRange[1]+1):
		srcSound = os.path.join(
			srcDir,
			'{0}{1}.ogg'.format(strString, fret)
		)
		destSound = os.path.join(
			destDir,
			'{0}{1}.ogg'.format(string, fret)
		)
		pitch = '500'
		print 'sox', srcSound, '-C 7.4', destSound, 'pitch', pitch
		subprocess.call(['sox', srcSound, '-C', '7.4', destSound, 'pitch', pitch])


generate_string('C')

# generate_higher_frets(
# 	['E', 'A', 'D', 'G'],
# 	startFret = 20,
# 	frets = [21, 22, 23, 24]
# )
