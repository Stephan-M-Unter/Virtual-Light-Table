import os, sys, subprocess, json
try:
    from PIL import Image
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow'])
    from PIL import Image

image_path = sys.argv[1]
image_name = os.path.basename(image_path)
image_name = image_name[:image_name.rfind(".")]
extension = image_path[image_path.rfind(".")+1:]
points = json.loads(sys.argv[2])
print(points)
xs = [int(p['x']) for p in points]
ys = [int(p['y']) for p in points]
left = min(xs)
right = max(xs)
upper = min(ys)
lower = max(ys)
image = Image.open(image_path)
crop = image.crop((left, upper, right, lower))
new_filename = f"{image_name}_frag.{extension}"
vlt_folder = os.path.join(os.getenv('APPDATA'), "Virtual Light Table", "temp", "imgs")
new_path = os.path.join(vlt_folder, new_filename)
crop.save(new_path)