import os, sys, subprocess, json
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
image = Image.open(image_path).convert('RGBA')
mask = Image.new('L', (image.size[0], image.size[1]), 0)
ImageDraw.Draw(mask).polygon(points, outline=1, fill=1)
image = np.array(image)
image[:,:,3] = np.array(mask)*255

image = Image.fromarray(image)

crop = image.crop((left, upper, right, lower))
new_filename = f"{image_name}_frag.{extension}"
vlt_folder = os.path.join(os.getenv('APPDATA'), "Virtual Light Table", "temp", "imgs")
new_path = os.path.join(vlt_folder, new_filename)

crop.save(new_path)