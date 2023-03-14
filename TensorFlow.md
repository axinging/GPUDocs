
```
# https://gist.github.com/MartinNowak/9a2e467d740c43fe7e6fef6c09502449
import os, sys

import google.protobuf
from tensorflow.core.protobuf import saved_model_pb2
import tensorflow as tf


def convert_saved_model_to_pbtxt(path):
    saved_model = saved_model_pb2.SavedModel()
    with open(os.path.join(path, 'saved_model.pb'), 'rb') as f:
        saved_model.ParseFromString(f.read())
    with open(os.path.join(path, 'saved_model.pbtxt'), 'w') as f:
        f.write(google.protobuf.text_format.MessageToString(saved_model))


for path in sys.argv[1:]:
    convert_saved_model_to_pbtxt(path)
```
