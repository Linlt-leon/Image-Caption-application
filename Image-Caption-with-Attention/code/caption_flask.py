import flask
import torch
import torch.nn.functional as F
import numpy as np
import json
import torchvision.transforms as transforms
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import skimage.transform
import argparse
# from scipy.misc import imread, imresize
import imageio
from PIL import Image
import io

# import os
# os.environ['CUDA_VISIBLE_DEVICES'] = '3'

app = flask.Flask(__name__)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# english model
decoder = None
encoder = None
word_map = None
rev_word_map = None
path_of_word_map = 'BEST_MODEL/WORDMAP_coco_5_cap_per_img_5_min_word_freq.json' 
path_of_model = 'BEST_MODEL/BEST_checkpoint_coco_5_cap_per_img_5_min_word_freq.pth.tar' 

# chinese model
decoder_chi = None
encoder_chi = None
word_map_chi = None
rev_word_map_chi = None
path_of_word_map_chi = 'BEST_MODEL/WORDMAP_ai_challenger_caption_5_cap_per_img_5_min_word_freq.json'
path_of_model_chi = 'BEST_MODEL/BEST_checkpoint_ai_challenger_caption_5_cap_per_img_5_min_word_freq.pth.tar'


BEAM_SIZE = 5

def caption_image_beam_search(encoder, decoder, image_path, word_map, beam_size=3):
    """
    Reads an image and captions it with beam search.

    :param encoder: encoder model
    :param decoder: decoder model
    :param image_path: path to image
    :param word_map: word map
    :param beam_size: number of sequences to consider at each decode-step
    :return: caption, weights for visualization
    """

    k = beam_size
    vocab_size = len(word_map)

    # Read image and process
    img = imageio.imread(image_path)
    if len(img.shape) == 2:
        img = img[:, :, np.newaxis]
        img = np.concatenate([img, img, img], axis=2)
    img = np.array(Image.fromarray(img).resize((256, 256)))
    img = img.transpose(2, 0, 1)
    img = img / 255.
    img = torch.FloatTensor(img).to(device)
    normalize = transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                     std=[0.229, 0.224, 0.225])
    transform = transforms.Compose([normalize])
    image = transform(img)  # (3, 256, 256)

    # Encode
    image = image.unsqueeze(0)  # (1, 3, 256, 256)
    encoder_out = encoder(image)  # (1, enc_image_size, enc_image_size, encoder_dim)
    enc_image_size = encoder_out.size(1)
    encoder_dim = encoder_out.size(3)

    # Flatten encoding
    encoder_out = encoder_out.view(1, -1, encoder_dim)  # (1, num_pixels, encoder_dim)
    num_pixels = encoder_out.size(1)

    # We'll treat the problem as having a batch size of k
    encoder_out = encoder_out.expand(k, num_pixels, encoder_dim)  # (k, num_pixels, encoder_dim)

    # Tensor to store top k previous words at each step; now they're just <start>
    k_prev_words = torch.LongTensor([[word_map['<start>']]] * k).to(device)  # (k, 1)

    # Tensor to store top k sequences; now they're just <start>
    seqs = k_prev_words  # (k, 1)

    # Tensor to store top k sequences' scores; now they're just 0
    top_k_scores = torch.zeros(k, 1).to(device)  # (k, 1)

    # Tensor to store top k sequences' alphas; now they're just 1s
    seqs_alpha = torch.ones(k, 1, enc_image_size, enc_image_size).to(device)  # (k, 1, enc_image_size, enc_image_size)

    # Lists to store completed sequences, their alphas and scores
    complete_seqs = list()
    complete_seqs_alpha = list()
    complete_seqs_scores = list()

    # Start decoding
    step = 1
    h, c = decoder.init_hidden_state(encoder_out)

    # s is a number less than or equal to k, because sequences are removed from this process once they hit <end>
    while True:

        embeddings = decoder.embedding(k_prev_words).squeeze(1)  # (s, embed_dim)

        awe, alpha = decoder.attention(encoder_out, h)  # (s, encoder_dim), (s, num_pixels)

        alpha = alpha.view(-1, enc_image_size, enc_image_size)  # (s, enc_image_size, enc_image_size)

        gate = decoder.sigmoid(decoder.f_beta(h))  # gating scalar, (s, encoder_dim)
        awe = gate * awe

        h, c = decoder.decode_step(torch.cat([embeddings, awe], dim=1), (h, c))  # (s, decoder_dim)

        scores = decoder.fc(h)  # (s, vocab_size)
        scores = F.log_softmax(scores, dim=1)

        # Add
        scores = top_k_scores.expand_as(scores) + scores  # (s, vocab_size)

        # For the first step, all k points will have the same scores (since same k previous words, h, c)
        if step == 1:
            top_k_scores, top_k_words = scores[0].topk(k, 0, True, True)  # (s)
        else:
            # Unroll and find top scores, and their unrolled indices
            top_k_scores, top_k_words = scores.view(-1).topk(k, 0, True, True)  # (s)

        # Convert unrolled indices to actual indices of scores
        prev_word_inds = top_k_words / vocab_size  # (s)
        next_word_inds = top_k_words % vocab_size  # (s)
        #print(prev_word_inds)
        prev_word_inds = prev_word_inds.long()
        
        # Add new words to sequences, alphas
        seqs = torch.cat([seqs[prev_word_inds], next_word_inds.unsqueeze(1)], dim=1)  # (s, step+1)
        seqs_alpha = torch.cat([seqs_alpha[prev_word_inds], alpha[prev_word_inds].unsqueeze(1)],
                               dim=1)  # (s, step+1, enc_image_size, enc_image_size)

        # Which sequences are incomplete (didn't reach <end>)?
        incomplete_inds = [ind for ind, next_word in enumerate(next_word_inds) if
                           next_word != word_map['<end>']]
        complete_inds = list(set(range(len(next_word_inds))) - set(incomplete_inds))

        # Set aside complete sequences
        if len(complete_inds) > 0:
            complete_seqs.extend(seqs[complete_inds].tolist())
            complete_seqs_alpha.extend(seqs_alpha[complete_inds].tolist())
            complete_seqs_scores.extend(top_k_scores[complete_inds])
        k -= len(complete_inds)  # reduce beam length accordingly

        # Proceed with incomplete sequences
        if k == 0:
            break
        seqs = seqs[incomplete_inds]
        seqs_alpha = seqs_alpha[incomplete_inds]
        h = h[prev_word_inds[incomplete_inds]]
        c = c[prev_word_inds[incomplete_inds]]
        encoder_out = encoder_out[prev_word_inds[incomplete_inds]]
        top_k_scores = top_k_scores[incomplete_inds].unsqueeze(1)
        k_prev_words = next_word_inds[incomplete_inds].unsqueeze(1)

        # Break if things have been going on too long
        if step > 50:
            break
        step += 1

    i = complete_seqs_scores.index(max(complete_seqs_scores))
    seq = complete_seqs[i]
    alphas = complete_seqs_alpha[i]

    return seq, alphas


def visualize_att(image_path, seq, alphas, rev_word_map, smooth=True):
    """
    Visualizes caption with weights at every word.

    Adapted from paper authors' repo: https://github.com/kelvinxu/arctic-captions/blob/master/alpha_visualization.ipynb

    :param image_path: path to image that has been captioned
    :param seq: caption
    :param alphas: weights
    :param rev_word_map: reverse word mapping, i.e. ix2word
    :param smooth: smooth weights?
    """
    #image = Image.open(image_path)
    image = Image.open(io.BytesIO(image_path))
    image = image.resize([14 * 24, 14 * 24], Image.LANCZOS)
    
    words = [rev_word_map[ind] for ind in seq]
#     words = list(filter(lambda x: x!='<unk>', words)) # cut <unk>
#     print(" ".join(words))
    result = " ".join(words[1:-1])
    return result
    

def visualize_att_chi(image_path, seq, alphas, rev_word_map, smooth=True):
    """
    Visualizes caption with weights at every word.

    Adapted from paper authors' repo: https://github.com/kelvinxu/arctic-captions/blob/master/alpha_visualization.ipynb

    :param image_path: path to image that has been captioned
    :param seq: caption
    :param alphas: weights
    :param rev_word_map: reverse word mapping, i.e. ix2word
    :param smooth: smooth weights?
    """
    #image = Image.open(image_path)
    image = Image.open(io.BytesIO(image_path))
    image = image.resize([14 * 24, 14 * 24], Image.LANCZOS)
    
    words = [rev_word_map[ind] for ind in seq]
#     print(" ".join(words))
    result = "".join(words[1:-1])
    return result


def load_model(path_of_model):
    """Load the pre-trained model, you can use your model just as easily.
    """
    global decoder
    global encoder
    checkpoint = torch.load(path_of_model, map_location=str(device))
    decoder = checkpoint['decoder']
    decoder = decoder.to(device)
    decoder.eval()
    encoder = checkpoint['encoder']
    encoder = encoder.to(device)
    encoder.eval()

def load_word_map(path_of_word_map):
    global word_map
    global rev_word_map
    with open(path_of_word_map, 'r') as j:
        word_map = json.load(j)
    rev_word_map = {v: k for k, v in word_map.items()}  # ix2word 

    
def load_model_chi(path_of_model):
    """Load the pre-trained model, you can use your model just as easily.
    """
    global decoder_chi
    global encoder_chi
    checkpoint = torch.load(path_of_model, map_location=str(device))
    decoder_chi = checkpoint['decoder']
    decoder_chi = decoder_chi.to(device)
    decoder_chi.eval()
    encoder_chi = checkpoint['encoder']
    encoder_chi = encoder_chi.to(device)
    encoder_chi.eval()

def load_word_map_chi(path_of_word_map):
    global word_map_chi
    global rev_word_map_chi
    with open(path_of_word_map, 'r') as j:
        word_map_chi = json.load(j)
    rev_word_map_chi = {v: k for k, v in word_map_chi.items()}  # ix2word 
    
    
@app.route("/image_caption_predict", methods=["POST"])
def predict():
    # Initialize the data dictionary that will be returned from the view.
    data = {"success": False}
 
    # Ensure an image was properly uploaded to our endpoint.
    if flask.request.method == 'POST':
        if flask.request.files.get("file"):
            #print("yes")
            # Read the image in PIL format
            image = flask.request.files["file"].read()
            
            # Encode, decode with attention and beam search
            seq, alphas = caption_image_beam_search(encoder, decoder, image, word_map, BEAM_SIZE)
            alphas = torch.FloatTensor(alphas)

            # Visualize caption and attention of best sequence
            result = visualize_att(image, seq, alphas, rev_word_map)
            
            
            #Chinese
            # Encode, decode with attention and beam search
            seq_chi, alphas_chi = caption_image_beam_search(encoder_chi, decoder_chi, image, word_map_chi, BEAM_SIZE)
            alphas_chi = torch.FloatTensor(alphas_chi)
            
            # Visualize caption and attention of best sequence
            result_chi = visualize_att_chi(image, seq_chi, alphas_chi, rev_word_map_chi)
            
            data['predictions'] = result
            data['predictions_chi'] = result_chi
 
            # Indicate that the request was a success.
            data["success"] = True
#         else:
#             print("error")
 
    # Return the data dictionary as a JSON response.
    return flask.jsonify(data)

@app.route('/')
def welcome():
    return "Hello"
    
if __name__ == '__main__':
    # Load model
    load_model(path_of_model)

    # Load word map (word2ix)
    load_word_map(path_of_word_map)
    
    # Load model-chi
    load_model_chi(path_of_model_chi)

    # Load word map (word2ix) -chi
    load_word_map_chi(path_of_word_map_chi)

    app.run(host="0.0.0.0", port=1198, threaded=True)


    
    
