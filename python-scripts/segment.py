import os, sys, json
import numpy as np
from PIL import Image
from urllib import request

# Input Arguments:
# [0] script name
# [1] path output folder
# [2] output file name
# [3] model path
# [4] model ID
# [5] path image 1
# [6] path image 2
# [7] ppi image 1
# [8] ppi image 2

path_output_folder = sys.argv[1]
output_filename = sys.argv[2]
path_model = sys.argv[3]
model_ID = sys.argv[4]
path_image1 = sys.argv[5]
path_image2 = sys.argv[6]
ppi1 = sys.argv[7]
ppi2 = sys.argv[8]

# TODO REMOVE
path_model = "C:/Users/unter/AppData/Roaming/Virtual Light Table/ML/models/model_8.2"

print(f'segment.py - Input[0]: script')
print(f'segment.py - Input[1] (path output folder): {path_output_folder}')
print(f'segment.py - Input[2] (output file): {output_filename}')
print(f'segment.py - Input[3] (model): {path_model}')
print(f'segment.py - Input[4] (model ID): {model_ID}')
print(f'segment.py - Input[5] (image1): {path_image1}')
print(f'segment.py - Input[6] (image2): {path_image2}')
print(f'segment.py - Input[7] (ppi1): {ppi1}')
print(f'segment.py - Input[8] (ppi2): {ppi2}')

sys.path.insert(0, path_model)
import VLT

model = VLT.VLTInferenceModel(path_model)

segmentation1 = None
segmentation2 = None
target_path1 = None
target_path2 = None

def segment_image(path_to_image, ppi):
    try:
        image = Image.open(path_to_image)
    except OSError:
        image_extension = path_to_image[path_to_image.rfind(".")+1:]
        temp_url = os.path.join(path_output_folder, 'temp.'+image_extension)
        request.urlretrieve(path_to_image, temp_url)
        image = Image.open(temp_url).convert('RGB')
        os.remove(temp_url)
    segmentation = model.predict(image, ppi)
    segmentation[segmentation <= 1] = 0
    segmentation[segmentation > 1] = 255
    segmentation = Image.fromarray(segmentation)
    segmentation = segmentation.resize(image.size)
    segmentation = segmentation.convert('RGBA')

    image_name = os.path.basename(path_to_image)
    image_name = image_name[:image_name.rfind('.')]
    target_name = f'{image_name}_segmentation_{model_ID}.png' 
    target_path = os.path.join(path_output_folder, target_name)
    segmentation.save(target_path)

    return target_path

if path_image1 != 'null' and ppi1 != '':
    target_path1 = segment_image(path_image1, ppi1)

if path_image2 != 'null' and ppi2 != '':
    target_path2 = segment_image(path_image2, ppi2)

result = {
    'pathMask1': target_path1,
    'pathMask2': target_path2,
}

with open(os.path.join(path_output_folder, output_filename), 'w') as f:
    json.dump(result, f)
