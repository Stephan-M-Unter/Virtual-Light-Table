import os, sys, subprocess, json
try:
    from PIL import Image, ImageDraw
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow'])
    from PIL import Image, ImageDraw
try:
    import numpy as np
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'numpy'])
    import numpy as np

image_path = sys.argv[1]
image_name = os.path.basename(image_path)
image_name = image_name[:image_name.rfind(".")]
image = Image.open(image_path).convert('RGBA')
extension = 'png'
points = sys.argv[2]

if points == 'no_mask':
    mirror = np.zeros((image.size[1], image.size[0], 4))
    mirror[:,:,3] = 255
else:
    points = json.loads(points)
    points = [(int(p['x']), int(p['y'])) for p in points]
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    left = min(xs)
    right = max(xs)
    upper = min(ys)
    lower = max(ys)
    mask = Image.new('L', (image.size[0], image.size[1]), 0)
    ImageDraw.Draw(mask).polygon(points, outline=1, fill=1)
    image = np.array(image)
    image[:,:,3] = np.array(mask)*255

    image = Image.fromarray(image)
    mirror = np.array(image.crop((left, upper, right, lower))).astype('float64')
    mirror[:,:,:3] /= 180
    mirror = np.flip(mirror, axis=1)

mask_orig = np.array(image)[:,:,3]
mask_orig = np.flip(mask_orig, axis=1)
mask_orig[mask_orig != 0] = 255
mask_orig = 255-mask_orig
mirror[:,:,3] -= mask_orig
mirror = mirror.astype("uint8")

new_filename = f"{image_name}_mirror.{extension}"
vlt_folder = os.path.join(os.getenv('APPDATA'), "Virtual Light Table", "temp", "imgs")
new_path = os.path.join(vlt_folder, new_filename)

mirror = Image.fromarray(mirror).convert('RGBA')
mirror.save(new_path)
print(f'python: saving file {new_path}')