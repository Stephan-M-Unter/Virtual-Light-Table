import os, sys, json
from PIL import Image
import cv2
import numpy as np

# Input arguments:
# [0] script name
# [1] path: mask1
# [2] path: mask2

path_mask1 = sys.argv[1]
path_mask2 = sys.argv[2]

assert(os.path.exists(path_mask1)), "ERROR - Mask1 not found!"
assert(os.path.exists(path_mask2)), "ERROR - Mask2 not found!"

def getMBR(image, threshold=120):
    np_array = np.array(image)
    box = [0, 0, np_array.shape[1], np_array.shape[0]] # x_min, y_min, x_max, y_max

    found_x_min = False
    found_y_min = False

    for i in range(box[2]):
        col = np_array[:,i]
        col = col[col >= threshold]
        if not found_x_min:
            if np.any(col):
                box[0] = i
                found_x_min = True
                continue
        else:
            if len(col) == 0:
                box[2] = i
                break

    for i in range(box[3]):
        row = np_array[i,:]
        row = row[row >= threshold]
        if not found_y_min:
            if np.any(row):
                box[1] = i
                found_y_min = True
                continue
        else:
            if len(row) == 0:
                box[3] = i
                break

    return box

def getTranslation(bb1, bb2):

    cx1 = (bb1[2] + bb1[0]) // 2
    cy1 = (bb1[3] + bb1[1]) // 2
    cx2 = (bb2[2] + bb2[0]) // 2
    cy2 = (bb2[3] + bb2[1]) // 2

    x = cx2 - cx1
    y = cy2 - cy1
    return ((x, y), (cx1, cy1), (cx2, cy2))

def cutBB(mask, bb, targetSize):
    cut = mask.crop(bb)
    cutFull = Image.new(mask.mode, (targetSize, targetSize), (0,0,0))
    x = (targetSize // 2) - (cut.size[0] // 2)
    y = (targetSize // 2) - (cut.size[1] // 2)
    cutFull.paste(cut, (x, y))
    return cutFull

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

def getRotation(mask1, mask2, bb1, bb2):
    w = max(mask1.size[0], mask2.size[0])
    h = max(mask2.size[1], mask2.size[1])
    targetSize = max(w, h)

    cut1 = cutBB(mask1, bb1, targetSize)
    cut2 = cutBB(mask2, bb2, targetSize)
    cut2 = cut2.transpose(Image.FLIP_LEFT_RIGHT)

    maxOverlap = None
    maxOverlapDegree = 0
    overlaps = []
    rotationSteps = 20

    for deg in range(0,360, rotationSteps):
        cut2_rotated = cut2.rotate(deg)
        overlap = computeOverlap(cut1, cut2_rotated)
        overlaps.append(overlap)

        if maxOverlap is None or maxOverlap < overlap:
            maxOverlap = overlap
            maxOverlapDegree = deg


    maxOverlapDegree2 = 0
    maxOverlap2 = None
    overlaps2 = []

    for deg in range(maxOverlapDegree-rotationSteps+1,maxOverlapDegree+rotationSteps-1, 1):
        cut2_rotated = cut2.rotate(deg)
        overlap = computeOverlap(cut1, cut2_rotated)
        overlaps2.append(overlap)

        if maxOverlap2 is None or maxOverlap2 < overlap:
            maxOverlap2 = overlap
            maxOverlapDegree2 = deg

    return 360 - maxOverlapDegree2

def register(mask1, mask2):
    bb1 = getMBR(mask1)
    bb2 = getMBR(mask2)
    translation = getTranslation(bb1, bb2)
    rotation = getRotation(mask1, mask2, bb1, bb2)

    return translation, rotation

mask1 = Image.open(path_mask1)
mask2 = Image.open(path_mask2)
translation, rotation = register(mask1,mask2)

result = {
    'mask1': path_mask1,
    'mask2': path_mask2,
    'translation': translation[0],
    'c1': translation[1],
    'c2': translation[2],
    'rotation': rotation,
}

with open('register_result.json', 'w') as f:
    json.dump(result, f)