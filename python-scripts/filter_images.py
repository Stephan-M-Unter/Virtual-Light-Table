import os, json, sys, subprocess

try:
    from urllib import request
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'urllib'])
try:
    import numpy as np
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'numpy'])
    import numpy as np
try:
    from PIL import Image,ImageEnhance
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'pillow'])
    from PIL import Image,ImageEnhance

Image.MAX_IMAGE_PIXELS = None

vlt_folder = os.path.join(sys.argv[1], 'temp', 'imgs')
filter_json = json.load(open(sys.argv[2], 'r'))
urls = filter_json['urls']
filters = filter_json['filters']

for url in urls:
    image_extension = url[url.rfind(".")+1:]
    try:
        image = Image.open(url).convert('RGBA')
    except OSError:
        temp_url = os.path.join('temp.'+image_extension)
        request.urlretrieve(url, temp_url)
        image = Image.open(temp_url).convert('RGBA')
        os.remove(temp_url)
    if not '_mirror.' in url:
        # if 'brightness' is set: change brightness
        if 'brightness' in filters and filters['brightness'] != 1:
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(float(filters['brightness']))
        # if 'contrast' is set: change contrast
        if 'contrast' in filters and filters['contrast'] != 1:
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(float(filters['contrast']))
        # if 'saturation' is set: change saturation
        if 'saturation' in filters and filters['saturation'] != 1:
            enhancer = ImageEnhance.Color(image)
            image = enhancer.enhance(float(filters['saturation']))
        # if 'sharpness' is set: change sharpness
        if 'sharpness' in filters and filters['sharpness'] != 1:
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(float(filters['sharpness']))
        image = np.array(image)
        # invert color channels
        if filters['invertR']:
            image[:,:,0] = 255-image[:,:,0]
        if filters['invertG']:
            image[:,:,1] = 255-image[:,:,1]
        if filters['invertB']:
            image[:,:,2] = 255-image[:,:,2]

        # if 'blackwhite' is true: convert to black and white
        if filters['blackwhite']:
            alpha = image[:,:,3]
            image = np.mean(image[:,:,:3], axis=2)
            image = np.stack((image,)*3, axis=-1)
            image = np.dstack((image, alpha))
            image = np.uint8(image)

        image = Image.fromarray(image)

    # derive filename without file extension
    filename = os.path.basename(url)
    filename = filename[:filename.rfind(".")]

    # derive the directory of the image
    directory = os.path.dirname(url)

    # make sure that a "graphicFilters" subfolder exists
    os.makedirs(os.path.join(directory, 'graphicFilters'), exist_ok=True)

    # define the target path
    filepath = os.path.join(directory, 'graphicFilters', f'{filename}.png')

    # save the image
    image.save(filepath)