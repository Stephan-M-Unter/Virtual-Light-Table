import os, json, sys
import tensorflow as tf
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

class VLTInferenceModel():
    def __init__(self, path_to_model):
        self.model = tf.keras.models.load_model(path_to_model)
        self.target_ppi = 400
        self.batch_size = 4096

    def predict(self, image, ppi, argmax=True):
        """Predicts the segmentation mask of an image."""
        patches, locations, mask_size = self.preprocess(image, ppi, argmax)
        del image # free memory
        
        while True:
            try:
                masks = self.segment(patches, argmax)
            except:
                if self.batch_size == 1:
                    raise Exception('ERROR - batch_size is at 1, operation still exceeds available memory.')
                self.batch_size = int(self.batch_size // 2)
            else:
                break
            
        segmentation = self.postprocess(mask_size, masks, locations)
        return segmentation

    def train(self):
        """Trains the model. (Not yet implemented)"""
        print("Training not yet implemented.")

    def preprocess(self, image, ppi, argmax):
        """Preprocesses an image for segmentation."""
        if isinstance(image, str):
            image = Image.open(image)
        if isinstance(ppi, str):
            ppi = int(float(ppi))
        image = image.convert('RGB')
        width = image.size[0]
        height = image.size[1]

        width, height = self.scale_image(width, height, ppi)
        image = image.resize((width, height))

        image_array = np.array(image)
        image_array = image_array / 255.

        if len(image_array.shape) < 3 or image_array.shape[2] == 1:
            image_array = np.stack([image_array, image_array, image_array], axis=-1)

        input_size = self.model.input_shape[1]

        assert width >= input_size, f"ERROR - Input image too small (width: {width}, required minimum width: {input_size})"
        assert height >= input_size, f"ERROR - Input image too small (height: {height}, required minimum height: {input_size})"

        patches = []
        locations = []

        for x in range(0, width, input_size):
            for y in range(0, height, input_size):
                left = x
                right = x + input_size
                top = y
                bottom = y + input_size

                if right > width:
                    right = width
                    left = right - input_size
                if bottom > height:
                    bottom = height
                    top = bottom - input_size

                patch = image_array[top:bottom, left:right, :]
                patches.append(patch)
                locations.append((left, top, right, bottom))

        patches = np.array(patches)

        # if argmax is True, the result will be argmaxed, so we only need 1 channel
        # otherwise, the result will be softmaxed, so we need all channels
        mask_size = (height, width) if argmax else (height, width, self.model.output_shape[-1])

        return patches, locations, mask_size

    def scale_image(self, width, height, ppi):
        if isinstance(ppi, str):
            ppi = int(float(ppi))

        if ppi > self.target_ppi:
            scaling_ratio = self.target_ppi / ppi
            width = int(width * scaling_ratio)
            height = int(height * scaling_ratio)

        min_size = self.model.input_shape[1]
        # if the smaller side of the image is smaller than the min_size,
        # set the smaller side to the min_size and scale the other side accordingly

        if width < min_size or height < min_size:
            if width < height:
                scaling_ratio = min_size / width
            else:
                scaling_ratio = min_size / height
            width = int(width * scaling_ratio)
            height = int(height * scaling_ratio)
            print(f'Setting image size to {width}x{height} pixels.')

        return width, height

    def segment(self, patches, argmax):
        output_shape = self.model.output_shape
        if argmax:
            # result will be argmaxed, so we only need 1 channel
            output_shape = (len(patches), output_shape[1], output_shape[2])
        else:
            # result will be softmaxed, so we need all channels
            output_shape = (len(patches), output_shape[1], output_shape[2], output_shape[3])
        masks = np.zeros(output_shape)

        for start in range(0, len(patches), self.batch_size):
            end = start + self.batch_size
            batch = patches[start:end]
            prediction = self.model.predict(batch, verbose=0)
            if argmax:
                prediction = np.argmax(prediction, axis=-1)
            masks[start:end] = prediction
        return masks

    def postprocess(self, mask_size, masks, locations):
        """
        Create an empty mask in the size of the (potentially scaled) input image and
        fill it with the predicted masks according to their locations.
        """
        mask = np.zeros(mask_size)

        input_size = self.model.input_shape[1]

        for i in range(0, len(masks)):
            left = locations[i][0]
            right = left + input_size
            top = locations[i][1]
            bottom = top + input_size
            mask[top:bottom, left:right] = masks[i]

        return mask    


