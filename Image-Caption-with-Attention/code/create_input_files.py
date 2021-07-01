from utils import create_input_files, create_input_files_CHINESE
import argparse

parser = argparse.ArgumentParser(description='Image-Caption-create_input_files')
parser.add_argument('--language', '-l', default="english", help='Dataset:english or chinese?')
args = parser.parse_args()

if __name__ == '__main__':
    
    # Create input files (along with word map)
    
    if args.language=='english':  
        create_input_files(dataset='coco',
                           karpathy_json_path='/data/lt/MSCOCO_14_Dataset/caption_datasets/dataset_coco.json',
                           image_folder='/data/lt/MSCOCO_14_Dataset/',
                           captions_per_image=5,
                           min_word_freq=5,
                           output_folder='/data/lt/MSCOCO_14_Dataset/',
                           max_len=50)
    
    elif args.language=='chinese':
        create_input_files_CHINESE(dataset="ai_challenger_caption", 
                                   train_json_path='/data/lt/ai_challenger_caption/ai_challenger_caption_train_20170902/caption_train_annotations_20170902.json',
                                   validation_json_path='/data/lt/ai_challenger_caption/ai_challenger_caption_validation_20170910/caption_validation_annotations_20170910.json',
                                   train_image_folder='/data/lt/ai_challenger_caption/ai_challenger_caption_train_20170902/caption_train_images_20170902',
                                   validation_image_folder='/data/lt/ai_challenger_caption/ai_challenger_caption_validation_20170910/caption_validation_images_20170910', 
                                   captions_per_image=5,
                                   min_word_freq=5,
                                   output_folder="/data/lt/ai_challenger_caption/ai_challenger_caption_train_20170902/",
                                   max_len=50)
