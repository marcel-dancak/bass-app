#!/usr/bin/python

import os
import sys
import json

from pydub import AudioSegment
from pydub.utils import audioop


def find_beginning(segment, threshold):
    data = segment.get_array_of_samples()
    index = 0
    length = int(segment.frame_count())

    while index < length:
        value = data[index]
        if value > threshold:
            break
        index += 10

    index = min(index, length-1)
    # find cross point
    while index > 0:
        value = data[index]
        if value <= 0:
            break
        index -= 1
    return index+1

def segment_positive_amplitude(segment):
    return audioop.minmax(segment._data, segment.sample_width)[1]

def find_samples(audio):
    offsets = []
    total_frames = int(audio.frame_count())
    threshold = int(0.2 * 32768)
    start = 0
    while start < total_frames:
        # go by blocks and find the first one, with some louder audio signal
        segment = audio.get_sample_slice(start, start+22050)
        while segment_positive_amplitude(segment) < threshold:
            start += 22050;
            if start > total_frames:
                return offsets
            segment = audio.get_sample_slice(start, start+22050)

        # get exact beginning of the sound sample
        start = start + find_beginning(segment, threshold)
        end = start + 44100*7
        offsets.append([start, end])

        # find next silent space
        start = end
        segment = audio.get_sample_slice(start, start+22050)
        while segment.frame_count() > 0 and segment_positive_amplitude(segment) > threshold:
            start += 22050;
            segment = audio.get_sample_slice(start, start+22050)

    return offsets


params = {
    'file': 'finger_B0-20.wav',
    'string': 'B'
}
params = {
    'file': 'slap_B0-17.wav',
    'string': 'B'
}


audio = AudioSegment.from_wav('../bass-records/'+params['file'])
offsets = find_samples(audio)
index = params.get('first_index', 0)
for start, end in offsets:
    sample = audio.get_sample_slice(start, end)
    sample.export(
        "sounds/{0}{1}.ogg".format(params['string'], index),
        bitrate="128k",
        format="ogg",
        codec="libvorbis"
    )
    index += 1