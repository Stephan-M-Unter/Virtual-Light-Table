import os, sys, subprocess

try:
    from PIL import Image
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'pillow'])


image_path = sys.argv[1]
target_path = sys.argv[2]

image = Image.open(image_path)
image.save(target_path)