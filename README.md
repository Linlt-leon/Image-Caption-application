# Image-Caption-Application
## 介绍
  Image Caption是一个综合而具有挑战性的工作，我们基于实践课上所学知识的想法，选择了encoder-decoder加上attention机制的方式，分别使用 COCO 2014 英文caption数据集和 AI Challenger 2017 的中文caption数据集，基于PyTorch，复现并训练出了Kelvin Xu等人的论文[ Show, Attend, and Tell ](https://arxiv.org/abs/1502.03044)里的模型，然后将其部署在服务器上，并开发了配套的小程序作为一个image caption的应用，实现了不错的相应速度和结果。
 
## 数据预处理
  我们首先遍历数据集，对英文数据集直接分词，或对中文数据集调用结巴分词进行分词预处理，统计词频，制作词汇表，生成一个`WORDMAP.json`文件，同时划分出训练集、验证集与测试集，方便接下来直接读取该json文件来训练我们的模型。
  我们只需要下载好相关数据集后，并在`create_input_files.py`文件中设置好相关参数，运行下列代码即可自动生成WORDMAP文件，使用`-l`或`--language`来指定中英文，默认是英文：
```python3
python create_input_files.py -l="chinese"
```

## 训练模型
  在`train.py`文件中开头中设置好相关参数，直接运行下列代码即可开始训练模型：
```python3
python train.py
```

## 测试效果
  运行下面代码可以测试单张照片在指定模型下的效果：
```python3
python caption.py -l='english' --img='test.jpg' --model='BEST_checkpoint_coco_5_cap_per_img_5_min_word_freq.pth.tar' --word_map='WORDMAP_coco_5_cap_per_img_5_min_word_freq.json' --beam_size=5
```

  运行下面代码可以测试模型在指定beam_size下的BLEU4指标：
```python3
python eval.py -b=5
```

**参考**
https://github.com/sgrvinod/a-PyTorch-Tutorial-to-Image-Captioning
