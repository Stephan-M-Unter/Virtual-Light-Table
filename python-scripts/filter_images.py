import os, json, sys, subprocess

print(sys.version)

try:
    from urllib import request
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'urllib'])
try:
    import numpy as np
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'numpy'])
    import numpy as np
try:
    from PIL import Image,ImageEnhance
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'pillow'])
    from PIL import Image,ImageEnhance

vlt_folder = os.path.join(sys.argv[1], 'temp', 'imgs')
filter_json = json.load(open(sys.argv[2], 'r'))
urls = filter_json['urls']
filters = filter_json['filters']

for url in urls:
    image_extension = url[url.rfind(".")+1:]
    try:
        image = Image.open(url).convert('RGBA')
    except OSError:
        temp_url = 'temp.'+image_extension
        request.urlretrieve(url, temp_url)
        image = Image.open(temp_url).convert('RGBA')
        os.remove(temp_url)
    if not '_mirror.' in url:
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
        image = Image.fromarray(image)

    filename = os.path.basename(url)
    dot = filename.rfind(".")
    filename = filename[:dot]+'_filtered.png'
    filepath = os.path.join(vlt_folder, filename)
    image.save(filepath)