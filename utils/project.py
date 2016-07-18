#!/usr/bin/python

import os
import sys
import json


if __name__ == "__main__":

    folder = sys.argv[1] if len(sys.argv) > 1 else './'

    filenames = []
    for filename in os.listdir(folder):
        if filename.endswith(".json"):
            filename = os.path.join(folder, filename)
            filenames.append(filename)


    sections = []
    sections_index = []
    index = 0
    filenames = sorted(filenames)
    for filename in filenames:
        with open(filename, 'r') as f:
            section_name = os.path.basename(filename).replace('.json', '')
            section_data = json.load(f)
            sections.append(section_data)
            sections_index.append({
                'id': index,
                'name': section_name
            })
            index += 1

    print sections_index
    with open('project.json', 'w') as f:
        json.dump({
            'index': sections_index,
            'sections': sections
        }, f, indent=4)