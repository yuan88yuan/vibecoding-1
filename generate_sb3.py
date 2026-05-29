import zipfile
import json
import io

project_data = {
    "targets": [
        {
            "isStage": True,
            "name": "Stage",
            "variables": {},
            "lists": {},
            "broadcasts": {},
            "blocks": {},
            "comments": {},
            "currentCostume": 0,
            "costumes": [
                {
                    "assetId": "cd21514d0531fdffb22204e0ec5ed84a",
                    "name": "backdrop1",
                    "md5ext": "cd21514d0531fdffb22204e0ec5ed84a.svg",
                    "dataFormat": "svg",
                    "rotationCenterX": 240,
                    "rotationCenterY": 180
                }
            ],
            "sounds": [],
            "volume": 100,
            "layerOrder": 0,
            "tempo": 60,
            "videoTransparency": 50,
            "videoState": "on",
            "textToSpeechLanguage": None
        },
        {
            "isStage": False,
            "name": "Sprite1",
            "variables": {},
            "lists": {},
            "broadcasts": {},
            "blocks": {
                "a": {
                    "opcode": "event_whenflagclicked",
                    "next": "b",
                    "parent": None,
                    "inputs": {},
                    "fields": {},
                    "shadow": False,
                    "topLevel": True,
                    "x": 100,
                    "y": 100
                },
                "b": {
                    "opcode": "looks_say",
                    "next": None,
                    "parent": "a",
                    "inputs": {
                        "MESSAGE": [1, [10, "Hello, world!"]]
                    },
                    "fields": {},
                    "shadow": False,
                    "topLevel": False
                }
            },
            "comments": {},
            "currentCostume": 0,
            "costumes": [
                {
                    "assetId": "bcf454acf82e4504149f7ffe07081dbc",
                    "name": "costume1",
                    "bitmapResolution": 1,
                    "md5ext": "bcf454acf82e4504149f7ffe07081dbc.svg",
                    "dataFormat": "svg",
                    "rotationCenterX": 48,
                    "rotationCenterY": 50
                }
            ],
            "sounds": [],
            "volume": 100,
            "layerOrder": 1,
            "visible": True,
            "x": 0,
            "y": 0,
            "size": 100,
            "direction": 90,
            "draggable": False,
            "rotationStyle": "all around"
        }
    ],
    "monitors": [],
    "extensions": [],
    "meta": {
        "semver": "3.0.0",
        "vm": "0.2.0-prerelease.20200501170757",
        "agent": "Mozilla/5.0"
    }
}

empty_svg_stage = '<svg version="1.1" width="2" height="2" viewBox="-1 -1 2 2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>'
empty_svg_sprite = '<svg version="1.1" width="2" height="2" viewBox="-1 -1 2 2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><circle cx="0" cy="0" r="1" fill="blue"/></svg>'

with zipfile.ZipFile('hello_world.sb3', 'w') as z:
    z.writestr('project.json', json.dumps(project_data))
    z.writestr('cd21514d0531fdffb22204e0ec5ed84a.svg', empty_svg_stage)
    z.writestr('bcf454acf82e4504149f7ffe07081dbc.svg', empty_svg_sprite)

print("Created hello_world.sb3")
