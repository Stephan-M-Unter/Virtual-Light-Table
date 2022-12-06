import os, sys
import numpy as np
from PIL import Image

# Input Arguments:
# [0] script name
# [1] path mask
# [2] path changes
# [3] change mode ("remove" | "add")

path_mask = sys.argv[1]
path_change = sys.argv[2]
change_mode = sys.argv[3]

assert os.path.exists(path_mask), f"ERROR - Mask path ({path_mask}) not found!"
assert os.path.exists(path_change), f"ERROR - path for changes ({path_change}) not found!"
assert change_mode in ['remove', 'add'], f"ERROR - change mode ({change_mode}]) not found!"

mask = Image.open(path_mask)
change = Image.open(path_change).convert('LA')
change = change.resize(mask.size)

mask_array = np.array(mask)
change_array= np.array(change)[:,:,0]

if change_mode == "remove":
    mask_array[:,:,:3][change_array != 0] = [0,0,0]
elif change_mode == "add":
    mask_array[:,:,:3][change_array != 0] = [255, 255, 255]

mask = Image.fromarray(mask_array)

mask.save(path_mask)