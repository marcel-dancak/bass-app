#!/usr/bin/python

import os
import sys

from pydub import AudioSegment



if __name__ == "__main__":

    folder = sys.argv[1] if len(sys.argv) > 1 else './'
    dest = sys.argv[2] if len(sys.argv) > 2 else './'
    format = 'mp3'

    for filename in os.listdir(folder):
        if filename.endswith(format):
            in_file = os.path.join(folder, filename)
            if format == 'mp3':
                audio = AudioSegment.from_mp3(in_file)
            else:
                audio = AudioSegment.wav(in_file)
            audio.export(
                "{0}.ogg".format(os.path.join(dest, os.path.splitext(filename)[0])),
                bitrate="64k",
                format="ogg",
                codec="libvorbis",
                parameters=["-vol", "750"]
            )
