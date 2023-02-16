"""
Author: Stephan M. Unter (PhD Candidate/Crossing Boundaries/University of Basel)
Date:   14/02/2023

This script creates masked versions of input images according to user input. At the moment
(14/02/23) there are the following masking options available:
- no mask:      the image is not being masked at all, instead the original image is being used
- boundingbox:  a rectangle area of the input image is used as mask region; special
                    case of the polygon with just four vertices
- polygon:      a polygon area of the input image is used as mask region; the polygon
                    area is defined by a finite set of vertices
- automatic:    the input image is masked according to a mask bitmap produced by
                    an automatic segmentation algorithm; regions that are colored white (255)
                    are to be visible, while everything else is being removed

The script receives as input the location to a temporary JSON file where all necessary information
for the masking process is stored. This rather inconvenient message passing is needed for the
communication between the NodeJS application and the python subprocess.

The resulting mask images are being stored in the temporary image folder, identifable by
having the same filename as the original input images, just suffixed with a "_masked" attribute.
"""

import os, sys, subprocess, json
try:
    from urllib import request
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'urllib'])
try:
    from PIL import Image, ImageDraw
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'pillow'])
    from PIL import Image
try:
    import numpy as np
except:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'numpy'])
    import numpy as np


###########################
# READING INPUT ARGUMENTS #
###########################

# The input arguments are defined as follows:
#
#   [0]     Script Name
#   [1]     Path to Instructional JSON File

instructions = json.load(open(sys.argv[1], 'r'))

# The instructional json file has the following keys. Some of them are optional as
# they are only needed in a particular scenario, e.g. for automatic segmentation.
# Otherwise MUST be given as they contain decisive information for the algorithm
# to perform, e.g. specifying the mask_mode.
#
#   !   mask_mode           String      ['no_mask', 'polygon', 'boundingbox', 'automatic']
#                                       This one is essential, it tells the algorithm what masking
#                                       mode to expect and as such, which other fields have to
#                                       be given as they are essential for the process.
#
#                               -- RECTO --
#       path_src_img_1      String      Filepath to side 1 (recto) of the object.
#       vertices_1          List        [polygon, boundingbox] List of polygon vertices for polygon
#                                       or bounding_box mode for side 1 (recto) of the object.
#       auto_mask_1         String      [automatic] Path to a mask image created by an automatic
#                                       algorithm for side 1 (recto) of the image.
#
#                               -- VERSO --
#       path_src_img_2      String      Filepath to side 2 (verso) of the object.
#       vertices_2          List        [polygon, boundingbox] List of polygon vertices for polygon
#                                       or bounding_box mode for side 2 (verso) of the object.
#       auto_mask_2         String      [automatic] Path to a mask image created by an automatic
#                                       algorithm for side 2 (verso) of the image.
#
#                               -- OUTPUT --
#   !   output_path_1       String      Path for resulting masked image for input 1.
#   !   output_path_2       String      Path for resulting masked image for input 2.
#   

mode = instructions['mask_mode']

def load_images(instructions:dict):
    image_1 = None
    image_2 = None
    if 'path_src_img_1' in instructions.keys() and instructions['path_src_img_1'] is not None:
        image_1 = load_image(instructions['path_src_img_1'])
    if 'path_src_img_2' in instructions.keys() and instructions['path_src_img_2'] is not None:
        image_2 = load_image(instructions['path_src_img_2'])
    return (image_1, image_2)

def load_image(path:str):
    try:
        image = Image.open(path).convert('RGBA')
    except OSError:
        temp_path = os.path.join('.', 'temp.'+path[path.rfind('.')+1:])
        request.urlretrieve(path, temp_path)
        image = Image.open(temp_path).convert('RGBA')
        os.remove(temp_path)
    return image

def create_mirror_without_masking(opposite_img:Image) -> Image:
    img_width = opposite_img.size[0]
    img_height = opposite_img.size[1]
    channels = 4 #RGBA

    # creating black version in dimensions of opposite side
    mirrored_result = np.zeros((img_height, img_width, channels))
    # computing alpha channel for opposite side to reflect potential PNG inputs
    opposite_alpha_channel = np.array(opposite_alpha_channel)[:,:,3]
    opposite_alpha_channel = np.flip(opposite_alpha_channel, axis=1)
    opposite_alpha_channel[opposite_alpha_channel != 0] = 255
    # applying flipped version of opposite alpha channel to black dummy
    mirrored_result[:,:,3] += opposite_alpha_channel
    
    return mirrored_result

def create_by_polygon(image:Image, vertices:list) -> Image:
    # rounding all points to integer values
    if 'x' in vertices[0]:
        vertices = [(int(p['x']), int(p['y'])) for p in vertices]
    else:
        vertices = [(int(p[0]), int(p[1])) for p in vertices]
    xs = [p[0] for p in vertices]
    ys = [p[1] for p in vertices]
    width = image.size[0]
    height = image.size[1]

    mask = Image.new('L', (width, height), 0)
    ImageDraw.Draw(mask).polygon(vertices, outline=1, fill=1)

    image_arr = np.array(image)
    mask_original = (image_arr[:,:,3] / 255.).astype('uint8')
    image_arr[:,:,3] = np.array(mask)*255
    image_arr[:,:,3] += mask_original

    mirror = Image.fromarray(image_arr)
    mirror = mirror.crop((min(xs), min(ys), max(xs), max(ys)))

    return mirror

def create_mirror_by_polygon(opposite_image:Image, opposite_vertices:list) -> Image:
    # rounding all points to integer values
    if 'x' in opposite_vertices[0]:
        vertices = [(int(p['x']), int(p['y'])) for p in opposite_vertices]
    else:
        vertices = [(int(p[0]), int(p[1])) for p in opposite_vertices]
    xs = [p[0] for p in vertices]
    ys = [p[1] for p in vertices]
    width = opposite_image.size[0]
    height = opposite_image.size[1]

    # creating an empty (black) image in original size and drawing the polygon into it
    mask = Image.new('L', (width, height), 0)
    ImageDraw.Draw(mask).polygon(vertices, outline=1, fill=1)

    # read the alpha channel for the original image (as it might be a PNG)
    image_arr = np.array(opposite_image)
    image_arr[:,:,:3] = 0
    image_arr[:,:,3] = np.array(mask)*255

    # TODO - is this really necessary?!
    mask_original = np.array(opposite_image)[:,:,3]
    mask_original[mask_original != 0] = 1
    image_arr[:,:,3] *= mask_original

    mirror = Image.fromarray(image_arr)
    # crop to polygon area and flip horizontally as we create a MIRROR version
    mirror = mirror.crop((min(xs), min(ys), max(xs), max(ys)))
    mirror = np.array(mirror)
    mirror = np.flip(mirror, axis=1)
    mirror = Image.fromarray(mirror)
    mirror = mirror.convert('RGBA')

    return mirror

def create_by_mask(image:Image, mask:Image) -> Image:
    # TODO
    pass

def create_mirror_by_mask(image:Image, mask:Image) -> Image:
    # TODO
    pass

def register_automatic_masks(image_1:Image, image_2:Image, mask_1:Image, mask_2:Image):
    # TODO
    pass


###############################
#          EXECUTION
###############################

image_1, image_2 = load_images(instructions)

if mode in ['boundingbox', 'polygon']:
    vertices_1 = instructions['vertices_1']
    vertices_2 = instructions['vertices_2']
    if image_1 and vertices_1:
        output_1 = create_by_polygon(image_1, vertices_1)
    else:
        output_1 = create_mirror_by_polygon(image_2, vertices_2)
    if image_2 and vertices_2:
        output_2 = create_by_polygon(image_2, vertices_2)
    else:
        output_2 = create_mirror_by_polygon(image_1, vertices_1)
elif mode in ['automatic']:
    mask_1 = None
    mask_2 = None
    if 'auto_mask_1' in instructions.keys():
        mask_1 = Image.open(instructions['auto_mask_1'])
    if 'auto_mask_2' in instructions.keys():
        mask_2 = Image.open(instructions['auto_mask_2'])
    
    if image_1 and mask_1:
        output_1 = create_by_mask(image_1, mask_1)
    else:
        output_1 = create_mirror_by_mask(image_2, mask_2)
    if image_2 and mask_2:
        output_2 = create_by_mask(image_2, mask_2)
    else:
        output_2 = create_mirror_by_mask(image_1, mask_1)

    output_1, output_2 = register_automatic_masks(output_1, output_2, mask_1, mask_2)

else:
    # any other case, i.e. 'no_mask' or not recognised cases
    # here, we only load the images and save them in their new spot
    if image_1:
        output_1 = image_1
    else:
        output_1 = create_mirror_without_masking(image_2)
    if image_2:
        output_2 = image_2
    else:
        output_2 = create_mirror_without_masking(image_1)

output_1.save(instructions['output_path_1'])
output_2.save(instructions['output_path_2'])
