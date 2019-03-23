import math
import random

def sigmoid(x):
    return 1.0/(1+ math.exp(-x))

def genie_sigmoid_derivative(x):
    return x * (1.0 - x)

def zerolistmaker(n):
    listofzeros = [0] * n
    return listofzeros

class GenieDistributedNeuralNetwork:
    def __init__(self, x, y):
        self.input      = x
        self.weights1   = random.rand(self.input.shape[1],4)
        self.weights2   = random.rand(4,1)
        self.y          = y
        self.output     = zerolistmaker(self.y.shape)

    def feedforward(self):

        dotproduct1 = sum(i * j for i, j in zip(self.input, self.weights1))
        self.layer1 = sigmoid(dotproduct1)
        dotproduct2 = sum(i * j for i, j in zip(self.layer1, self.weights2))
        self.output = sigmoid(dotproduct2)

    def backprop(self):
        # application of the chain rule to find derivative of the loss function with respect to weights2 and weights1

        dotproduct3 = sum(i * j for i, j in zip(self.layer1.T, (2*(self.y - self.output) * genie_sigmoid_derivative(self.output))))
        d_weights2 = dotproduct3

        dotproduct4 = sum(i * j for i, j in zip(2*(self.y - self.output) * genie_sigmoid_derivative(self.output), self.weights2.T))
        d_weights1 = sum(i * j for i, j in zip(self.input.T, dotproduct4* genie_sigmoid_derivative(self.layer1)))


        # update the weights with the derivative (slope) of the loss function
        self.weights1 += d_weights1
        self.weights2 += d_weights2

