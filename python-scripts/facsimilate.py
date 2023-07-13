import os, sys, json
import numpy as np
from PIL import Image
from urllib import request
import tensorflow as tf

# Input Arguments:
# [0] script name
# [1] path output folder
# [2] path output filename
# [3] model path
# [4] model ID
# [5] path image
# [6] ppi image

path_output_folder = sys.argv[1]
path_output_filename = sys.argv[2]
path_model = sys.argv[3]
model_ID = sys.argv[4]
path_image1 = sys.argv[5]
ppi1 = sys.argv[6]

print('segment.py - Input[0]: script')
print(f'segment.py - Input[1] (path output folder): {path_output_folder}')
print(f'segment.py - Input[2] (path output file): {path_output_filename}')
print(f'segment.py - Input[3] (model): {path_model}')
print(f'segment.py - Input[4] (model ID): {model_ID}')
print(f'segment.py - Input[5] (image1): {path_image1}')
print(f'segment.py - Input[6] (ppi1): {ppi1}')

sys.path.insert(0, path_model)
import VLT

model = VLT.VLTInferenceModel(path_model)

segmentation = None
target_path = None

def segment_image(path_to_image, ppi):
    try:
        image = Image.open(path_to_image).convert('RGBA')
    except OSError:
        image_extension = path_to_image[path_to_image.rfind(".")+1:]
        temp_url = os.path.join(path_output_folder, 'temp.'+image_extension)
        request.urlretrieve(path_to_image, temp_url)
        image = Image.open(temp_url).convert('RGBA')
        os.remove(temp_url)
    segmentation = model.predict(image, ppi, argmax=False)

    image_size = image.size
    # swap width and height of image_size, keep all other dimensions
    image_size = (image_size[1], image_size[0], *image_size[2:])

    # segmentation is now a numpy array of shape (height, width, output_channels), where
    # output_channels: number of classes detected by the model
    # height/width: scaled image sizes for a target_ppi of 400 at maximum
    # thus, the segmentation needs to be scaled back to the original image size
    segmentation = tf.image.resize(segmentation, size=image_size, method='bilinear')

    image_array = tf.convert_to_tensor(np.array(image))
    alpha_channel = image_array[:, :, 3]
    alpha_mask = (alpha_channel == 0)
    background_channel = tf.ones_like(segmentation[:,:,0])
    segmentation = tf.where(alpha_mask[:, :, tf.newaxis], tf.concat([background_channel[:, :, tf.newaxis], tf.zeros_like(segmentation[:, :, 1:])], axis=2), segmentation)

    image_name = os.path.basename(path_to_image)
    image_name = image_name[:image_name.rfind('.')]
    target_name = f'{image_name}_segmentation.npy' 
    target_path = os.path.join(path_output_folder, target_name)
    
    np.save(target_path, segmentation.numpy())

    return target_path

if path_image1 != 'null' and ppi1 != '':
    target_path1 = segment_image(path_image1, ppi1)

sys.exit(0);