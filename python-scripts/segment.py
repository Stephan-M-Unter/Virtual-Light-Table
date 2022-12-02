import os, sys, json
import numpy as np
from PIL import Image
from urllib import request

# Input Arguments:
# [0] script name
# [1] model path
# [2] path image 1
# [3] path image 2
# [4] ppi image 1
# [5] ppi image 2

path_model = sys.argv[1]
path_image1 = sys.argv[2]
path_image2 = sys.argv[3]
ppi1 = sys.argv[4]
ppi2 = sys.argv[5]

# TODO REMOVE
path_model = "C:/Users/unter/AppData/Roaming/Virtual Light Table/ML/models/model_8.2"
# path_image1 = "C:/Users/unter/Desktop/CP009_027_rt.tif"
# path_image2 = "C:/Users/unter/Desktop/CP009_027_vs.tif"
# ppi1 = "1200"
# ppi2 = "1200"
# ppi1 = ''
# ppi2 = ''

print(f'segment.py - Input[0]: script')
print(f'segment.py - Input[1] (model): {path_model}')
print(f'segment.py - Input[2] (image1): {path_image1}')
print(f'segment.py - Input[3] (image2): {path_image2}')
print(f'segment.py - Input[4] (ppi1): {ppi1}')
print(f'segment.py - Input[5] (ppi2): {ppi2}')

sys.path.insert(0, path_model)
import VLT

model = VLT.VLTInferenceModel(path_model)


segmentation1 = None
segmentation2 = None
target_path1 = None
target_path2 = None

# TODO: REMOVE
target_path1 = 'C:/Users/unter/Desktop/Virtual Light Table/python-scripts/seg1.png'
target_path2 = 'C:/Users/unter/Desktop/Virtual Light Table/python-scripts/seg2.png'

if path_image1 != 'null' and ppi1 != '':
    try:
        image1 = Image.open(path_image1)
    except OSError:
        image_extension = path_image1[path_image1.rfind(".")+1:]
        temp_url = os.path.join('C:/Users/unter/Desktop/Virtual Light Table/python-scripts/', 'temp.'+image_extension)
        request.urlretrieve(path_image1, temp_url)
        image1 = Image.open(temp_url).convert('RGB')
        os.remove(temp_url)
    segmentation1 = model.predict(image1, ppi1)
    segmentation1[segmentation1 <= 1] = 0
    segmentation1[segmentation1 > 1] = 255
    segmentation1 = Image.fromarray(segmentation1)
    segmentation1 = segmentation1.resize(image1.size)
    segmentation1 = segmentation1.convert('RGBA')

    # target_path1 = './python-scripts/seg1.png'
    segmentation1.save(target_path1)

if path_image2 != 'null' and ppi2 != '':
    try:
        image2 = Image.open(path_image2)
    except OSError:
        image_extension = path_image2[path_image2.rfind(".")+1:]
        temp_url = os.path.join('C:/Users/unter/Desktop/Virtual Light Table/python-scripts/', 'temp.'+image_extension)
        request.urlretrieve(path_image2, temp_url)
        image2 = Image.open(temp_url).convert('RGB')
        os.remove(temp_url)
    segmentation2 = model.predict(image2, ppi2)
    segmentation2[segmentation2 <= 1] = 0
    segmentation2[segmentation2 > 1] = 255
    segmentation2 = Image.fromarray(segmentation2)
    segmentation2 = segmentation2.resize(image2.size)
    segmentation2 = segmentation2.convert('RGBA')

    # target_path2 = './python-scripts/seg2.png'
    segmentation2.save(target_path2)


result = {
    'pathMask1': target_path1,
    'pathMask2': target_path2,
}

with open('./python-scripts/segmentation_result.json', 'w') as f:
    json.dump(result, f)
