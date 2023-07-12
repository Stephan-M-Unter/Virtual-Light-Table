import os, sys, json
import numpy as np
from PIL import Image
from scipy.special import softmax
from skimage import measure
import cv2

"""
This script takes an existing segmentation of an image and creates a thresholded image from it.
"""

# Input Arguments:
# [0] script name
# [1] path control json

"""
The control JSON is a json file created by the calling application. It contains the following fields:
- path_output_file: path where the resulting image should be saved to
- path_segmentation: path to the segmentation numpy array; this array contains the probability values for all detected classes
- thresholds: a list of threshold values for each class;
    if a pixel has a value higher than the threshold, it is set as potentially being that class
    if a pixel has multiple potential classes, the class with the highest probability is chosen
    if a pixel has no potential classes, it is set to 0 and thus invisible/background

    The thresholds should be organised in a dictionary. If a class is supposed to be background,
    its value is either set to -1 or the key is not present in the dictionary.

    Example:
    {
        0: -1,
        1: -1,
        2: 0.3,
        3: 0.5,
        4: 0.8
    }

    In this example, the background and scale is set to -1, so it will not be checked if a pixel actively belongs to
    this class. The papyrus class has a threshold of 0.3, so if a pixel has a probability of 0.3 or higher to be papyrus,
    it will be set to papyrus. If a pixel has a probability of 0.5 or higher to be black ink, it will be set to black ink.
    If a pixel has a probability of 0.8 or higher to be red ink, it will be set to red ink.
    If a pixel has a probability of 0.3 or higher to be papyrus, but also a probability of 0.5 or higher to be black ink,
    it will be set to black ink, because it has a higher probability to be black ink.

- colors: a list of colors for each class; the colors should be organised in a dictionary
    Example:
    {
        0: [0, 0, 0, 0],
        1: [0, 0, 0, 0],
        2: [255, 255, 255, 255],
        3: [0, 0, 0, 255],
        4: [255, 0, 0, 255]
    }

    In this example, the background and scale is set to [0, 0, 0, 0], so it will be invisible.
    The papyrus class has a color of [255, 255, 255, 255], so it will be white.
    The black ink class has a color of [0, 0, 0, 255], so it will be black.
    The red ink class has a color of [255, 0, 0, 255], so it will be red.

    outline: a number indicating the strength of the papyrus outline. If this value is 0, no outline will be drawn.
"""

path_control_json = sys.argv[1]
control_json = json.load(open(path_control_json, 'r'))

path_output_file = control_json['path_output_file']
path_segmentation = control_json['path_segmentation']
thresholds = control_json['thresholds']
colors = control_json['colors']
outline = int(thresholds['outline'])

# load segmentation
segmentation = np.load(path_segmentation)
segmentation = softmax(segmentation, axis=-1)
n_classes = segmentation.shape[-1]
thresholds['2'] = 1 / n_classes

# create thresholded image
thresholded_image = np.zeros((segmentation.shape[0], segmentation.shape[1], 4), dtype=np.uint8)

# set everything to 0 that is not above the threshold
for class_id in range(n_classes):
    t = float(thresholds[str(class_id)])
    if t == -1:
        # if the threshold is -1, the class is supposed to be background
        segmentation[:, :, class_id] = 0
        continue
    segmentation[:,:,class_id][segmentation[:,:,class_id] < t] = 0

segmentation = np.argmax(segmentation, axis=-1)


if outline > 0:
    # finding the papyrus contours
    segmentation_papyrus = np.zeros_like(segmentation)
    segmentation_papyrus[segmentation >= 2] = 1
    # pad segmentation_papyrus with 0 to avoid border artifacts
    padding_size = 20
    segmentation_papyrus = np.pad(segmentation_papyrus, padding_size, mode='constant', constant_values=0)
    print('MIMIMI', np.unique(segmentation_papyrus))
    contours = measure.find_contours(segmentation_papyrus, 0.5)
    # move all contours back to original position
    for contour in contours:
        contour -= padding_size
# papyrus is no longer needed, thus set to background
segmentation[segmentation == 2] = 0

# draw the result to the thresholded image
for class_id in range(n_classes):
    color = colors[str(class_id)]
    thresholded_image[segmentation == class_id] = color

if outline > 0:
    for contour in contours:
        contour = np.flip(contour, axis=1)
        contour = contour.astype(np.int32)
        cv2.drawContours(thresholded_image, [contour], -1, (0, 0, 0, 255), outline)

# save the thresholded image
Image.fromarray(thresholded_image).save(path_output_file)

# exit the script
sys.exit(0)