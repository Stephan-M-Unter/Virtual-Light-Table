import os, sys, json
from PIL import Image
import numpy as np
from urllib import request

# Input arguments:
# [0] script name
# [1] path output folder
# [2] output filename
# [3] model ID
# [4] path: image1
# [5] path: mask1
# [6] path: image2
# [7] path: mask2

path_output_folder = sys.argv[1]
output_filename = sys.argv[2]
model_ID = sys.argv[3]
path_image1 = sys.argv[4]
path_mask1 = sys.argv[5]
path_image2 = sys.argv[6]
path_mask2 = sys.argv[7]

print(f'cut_automatic_masks.py - Input[0]: script')
print(f'cut_automatic_masks.py - Input[1] (path output file): {path_output_folder}')
print(f'cut_automatic_masks.py - Input[2] (output filename): {output_filename}')
print(f'cut_automatic_masks.py - Input[3] (model ID): {model_ID}')
print(f'cut_automatic_masks.py - Input[4] (path_image1): {path_image1}')
print(f'cut_automatic_masks.py - Input[5] (path_mask1): {path_mask1}')
print(f'cut_automatic_masks.py - Input[6] (path_image2): {path_image2}')
print(f'cut_automatic_masks.py - Input[7] (path_mask2): {path_mask2}')

target_path1 = None
target_path2 = None

def cut_image(path_image, path_mask):
    if not 'http' in path_image and (not os.path.exists(path_image) or not os.path.exists(path_mask)):
        return None
    
    try:
        image = np.array(Image.open(path_image).convert('RGBA'))
    except OSError:
        image_extension = path_image[path_image.rfind(".")+1:]
        temp_url = os.path.join(path_output_folder, 'temp.'+image_extension)
        request.urlretrieve(path_image, temp_url)
        image = np.array(Image.open(temp_url).convert('RGBA'))
        os.remove(temp_url)
    mask = np.array(Image.open(path_mask))[:,:,0]

    bb = getMBR(mask)

    image = crop(image, bb)
    mask = crop(mask, bb)

    image[:,:,3] = mask
    image = Image.fromarray(image)

    return image

def crop(np_array, boundingBox):
    left = boundingBox[0]
    top = boundingBox[1]
    right = boundingBox[2]
    bottom = boundingBox[3]

    np_array = np_array[top:bottom, left:right]

    return np_array

def getMBR(mask, threshold=120):
    mask = np.array(mask)
    left = 0
    right = mask.shape[1]
    top = 0
    bottom = mask.shape[0]

    try:
        mask[mask < threshold] = 0
        mask[mask >= threshold] = 255
    except:
        mask = np.array(mask)[:,:,3]
        mask[mask < threshold] = 0
        mask[mask >= threshold] = 255

    for x in range(0, mask.shape[1]-1):
        col = mask[:,x]
        if np.sum(col) != 0:
            left = x
            break

    for x in range(mask.shape[1]-1, 0, -1):
        col = mask[:,x]
        if np.sum(col) != 0:
            right = x
            break

    for y in range(0, mask.shape[0]-1):
        row = mask[y,:]
        if np.sum(row) != 0:
            top = y
            break

    for y in range(mask.shape[0]-1, 0, -1):
        row = mask[y,:]
        if np.sum(row) != 0:
            bottom = y
            break

    return [left, top, right, bottom]

def computeOverlap(cut1, cut2, threshold=120):
    cut1 = np.array(cut1)
    cut2 = np.array(cut2)
    cut1[cut1 < threshold] = 0
    cut2[cut2 < threshold] = 0
    overlap = np.ones(cut1.shape)
    overlap[cut1 == 0] = 0
    overlap[cut2 == 0] = 0
    overlap = int(np.sum(overlap))
    return overlap

def cutBB(mask, targetSize):
    cutFull = Image.new(mask.mode, (targetSize, targetSize), 0)
    x = (targetSize // 2) - (mask.size[0] // 2)
    y = (targetSize // 2) - (mask.size[1] // 2)
    cutFull.paste(mask, (x, y))
    return cutFull

def getRotation(mask1, mask2):
    mask1 = np.array(mask1)[:,:,3]
    mask2 = np.array(mask2)[:,:,3]
    mask1 = Image.fromarray(mask1)
    mask2 = Image.fromarray(mask2)
    w = max(mask1.size[0], mask2.size[0])
    h = max(mask2.size[1], mask2.size[1])
    targetSize = max(w, h)

    mask1 = cutBB(mask1, targetSize)
    mask2 = cutBB(mask2, targetSize)
    mask2_flipped = mask2.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    maxOverlap = None
    maxOverlapDegree = 0
    overlaps = []
    rotationSteps = 20

    for deg in range(0,360, rotationSteps):
        mask2_rotated = mask2_flipped.rotate(deg)
        overlap = computeOverlap(mask1, mask2_rotated)
        overlaps.append(overlap)

        if maxOverlap is None or maxOverlap < overlap:
            maxOverlap = overlap
            maxOverlapDegree = deg

    maxOverlapDegree2 = 0
    maxOverlap2 = None
    overlaps2 = []

    for deg in range(maxOverlapDegree-rotationSteps+1,maxOverlapDegree+rotationSteps-1, 1):
        mask2_rotated = mask2_flipped.rotate(deg)
        overlap = computeOverlap(mask1, mask2_rotated)
        overlaps2.append(overlap)

        if maxOverlap2 is None or maxOverlap2 < overlap:
            maxOverlap2 = overlap
            maxOverlapDegree2 = deg

    return 360 - maxOverlapDegree2

def register(image1, image2):
    if image1 is None or image2 is None:
        return image1, image2
    
    rotation = getRotation(image1, image2)
    image2 = image2.rotate(rotation, expand=1)
    image2 = image2.crop(getMBR(image2))

    return image1, image2

cut1 = cut_image(path_image1, path_mask1)
cut2 = cut_image(path_image2, path_mask2)
cut1, cut2 = register(cut1, cut2)

if cut1 is not None:
    image1_name = os.path.basename(path_image1)
    image1_name = image1_name[:image1_name.rfind('.')]
    image1_name = f'{image1_name}_cut_{model_ID}.png'
    target_path1 = os.path.join(path_output_folder, image1_name)
    cut1.save(target_path1)
if cut2 is not None:
    image2_name = os.path.basename(path_image2)
    image2_name = image2_name[:image2_name.rfind('.')]
    image2_name = f'{image2_name}_cut_{model_ID}.png'
    target_path2 = os.path.join(path_output_folder, image2_name)
    cut2.save(target_path2)

result = {
    'cut1': target_path1,
    'cut2': target_path2,
}

with open(os.path.join(path_output_folder, output_filename), 'w') as f:
    json.dump(result, f)
