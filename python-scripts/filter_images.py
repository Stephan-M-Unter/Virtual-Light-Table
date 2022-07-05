from modulefinder import Module
import os, json, sys, subprocess
try:
    import numpy as np
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'numpy'])
    import numpy as np
try:
    from PIL import Image,ImageEnhance
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow'])
    from PIL import Image,ImageEnhance

vlt_folder = os.path.join(sys.argv[1], 'temp', 'imgs')
filter_json = json.load(open(sys.argv[2], 'r'))
urls = filter_json['urls']
filters = filter_json['filters']

for url in urls:
    if '_mirror.' in url:
        continue
    image = Image.open(url)
    image_rgb = Image.open(url)

    if filters['brightness'] != 1:
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(float(filters['brightness']))
    if filters['contrast'] != 1:
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(float(filters['contrast']))
    image = np.array(image)
    if filters['invertR']:
        image[:,:,0] = 255-image[:,:,0]
    if filters['invertG']:
        image[:,:,1] = 255-image[:,:,1]
    if filters['invertB']:
        image[:,:,2] = 255-image[:,:,2]

    filename = os.path.basename(url)
    dot = filename.rfind(".")
    filename = f'{filename[:dot]}_filtered.{filename[dot+1:]}'
    filepath = os.path.join(vlt_folder, filename)
    image = Image.fromarray(image)
    image.save(filepath)