import os, sys, subprocess, json, urllib.request
try:
    from PIL import Image, ImageDraw
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow'])
    from PIL import Image
try:
    import numpy as np
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'numpy'])
    import numpy as np

image_path = sys.argv[1]
vlt_folder = sys.argv[3]
image_extension = image_path[image_path.rfind(".")+1:]
image_name = os.path.basename(image_path)
image_name = image_name[:image_name.rfind(".")]
extension = 'png'
points = json.loads(sys.argv[2])
points = [(int(p['x']), int(p['y'])) for p in points]
xs = [p[0] for p in points]
ys = [p[1] for p in points]
left = min(xs)
right = max(xs)
upper = min(ys)
lower = max(ys)

try:
    image = Image.open(image_path).convert('RGBA')
except OSError:
    temp_url = f'temp.{image_extension}'
    urllib.request.urlretrieve(image_path, temp_url)
    image = Image.open(temp_url).convert('RGBA')
    os.remove(temp_url)

mask = Image.new('L', (image.size[0], image.size[1]), 0)
ImageDraw.Draw(mask).polygon(points, outline=1, fill=1)
image = np.array(image)
mask_orig = image[:,:,3] / 255.
mask_orig = mask_orig.astype("uint8")
image[:,:,3] = np.array(mask)*255
image[:,:,3] *= mask_orig

image = Image.fromarray(image)

crop = image.crop((left, upper, right, lower))
new_filename = f"{image_name}_frag.{extension}"
vlt_folder = os.path.join(vlt_folder, "temp", "imgs")
new_path = os.path.join(vlt_folder, new_filename)

crop.save(new_path)
print(f'python: saving file {new_path}')