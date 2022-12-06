import os, sys
import numpy as np
from PIL import Image

# Input Arguments:
# [0] script name
# [1] path mask
# [2] path corrections
# [3] change mode ("remove" | "add")

path_mask = sys.argv[1]
path_correction = sys.argv[2]
correction_mode = sys.argv[3]

assert os.path.exists(path_mask), f"ERROR - Mask path ({path_mask}) not found!"
assert os.path.exists(path_correction), f"ERROR - path for changes ({path_correction}) not found!"
assert correction_mode in ['remove', 'add'], f"ERROR - change mode ({correction_mode}]) not found!"

mask = Image.open(path_mask)
correction = Image.open(path_correction).convert('LA')
correction = correction.resize(mask.size)

mask_array = np.array(mask)
change_array= np.array(correction)[:,:,0]

if correction_mode == "remove":
    mask_array[:,:,:3][change_array != 0] = [0,0,0]
elif correction_mode == "add":
    mask_array[:,:,:3][change_array != 0] = [255, 255, 255]

mask = Image.fromarray(mask_array)

mask.save(path_mask)