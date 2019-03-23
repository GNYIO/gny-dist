const nj = require('numjs');
const axios = require('axios');


function genie_sigmoid(x){
	this.gs = 1.0/(1+ nj.exp(nj.negative(x)));
    return this.gs
}

function siggy(x){
	console.log("siggy x ");
	console.log(x);


	this.neg_x = nj.negative(x);
	console.log("this.neg_x");
	console.log(this.neg_x);


	this.exppx = nj.exp(this.neg_x);

	console.log("exppx");
	console.log(this.exppx);

	this.myones = nj.ones([8,8]);

	console.log("myones");
	console.log(this.myones);

	this.addone = this.exppx.add(this.myones);


	console.log("addone");
	console.log(this.addone);


	this.myones_again = nj.ones([8,8]);

	this.mysig = this.myones_again.divide(this.addone);

  	//this.sig = 1.0/(1+ nj.exp(-x));

  	//console.log(this.sig);

    //return 1.0/(1+ nj.exp(-x));
    return this.mysig;
}


function siggy2(x){
	console.log("siggy x ");
	console.log(x);


	this.neg_x = nj.negative(x);
	console.log("this.neg_x");
	console.log(this.neg_x);


	this.exppx = nj.exp(this.neg_x);

	console.log("exppx");
	console.log(this.exppx);

	this.myones = nj.ones([8,1]);

	console.log("myones");
	console.log(this.myones);

	this.addone = this.exppx.add(this.myones);


	console.log("addone");
	console.log(this.addone);


	this.myones_again = nj.ones([8,1]);

	this.mysig = this.myones_again.divide(this.addone);

  	//this.sig = 1.0/(1+ nj.exp(-x));

  	//console.log(this.sig);

    //return 1.0/(1+ nj.exp(-x));
    return this.mysig;
}

function genie_sigmoid_d1(x){

	console.log("x ");
	console.log(x);
	this.myx = x;
	this.myxx = x;


	this.myones_again = nj.ones([8,1]);

	this.c = this.myones_again.subtract(this.myx);

	console.log(c);
	this.rr = this.myxx.multiply(this.c);

    return this.rr;
}


function genie_sigmoid_d2(x){

	console.log("x ");
	console.log(x);
	this.myx = x;
	this.myxx = x;


	this.myones_again = nj.ones([8,8]);

	this.c = this.myones_again.subtract(this.myx);

	console.log(c);
	this.rr = this.myxx.multiply(this.c);

    return this.rr;
}

function genie_sigmoid_derivative(x){
    return x * (1.0 - x)
}

class GenieDistributedNeuralNetwork{


constructor(X,y) {
        this.input      = X;
        this.weights1   = nj.random(this.input.shape[1],8);
        this.weights2   = nj.random(8,1);                
        this.y          = y;
        this.output     = nj.zeros(this.y.shape);

  }




  feedforward() {

  	//this.layer1 = genie_sigmoid(nj.dot(this.input, this.weights1));

	console.log("feedforward");

	console.log(" input ");
	console.log(this.input);

	console.log(" weights1 ");
	console.log(this.weights1);

	console.log(" end  ");

	this.d = nj.dot(this.input, this.weights1);

	console.log(" ... d  ... ");
	console.log(this.d);

	this.layer1 = siggy(this.d);
	console.log(" layer1 ");
	console.log(this.layer1);

	this.d2 = nj.dot(this.layer1, this.weights2);
	console.log(" d2 ");
	console.log(this.d2);



	this.output = siggy2(this.d2);
	console.log(" output ");
	console.log(this.output);


  }


  backprop() {
	console.log("back");



	//this.d_weights2 = nj.dot(this.layer1.T, (2*(this.y - this.output) * genie_sigmoid_derivative(this.output)));

	console.log("output ");
	console.log(this.output);

	this.gsd = genie_sigmoid_d1(this.output);
	console.log("gsd ");
	console.log(this.gsd);

	this.myy = this.y;
	this.myo = this.output;
	this.subs = this.myy.subtract(this.myo);
	console.log("subs ");
	console.log(this.subs);

	this.mmm = this.subs.multiply(this.gsd);

	console.log("mmm ");
	console.log(this.mmm);


	this.myones_1 = nj.ones([8,1]);
	this.myones_2 = nj.ones([8,1]);

	this.mytwo_2 = this.myones_1.add(this.myones_2);
	console.log(this.mytwo_2);

	this.dright = this.mytwo_2.multiply(this.mmm);
	console.log("dright ");
	console.log(this.dright);

	this.T = this.layer1.T;


	console.log("this.T  ");
	console.log(this.T);

	this.d_weights2 = nj.dot(this.T,this.dright);

	console.log("this.d_weights2  ");
	console.log(this.d_weights2);

	this.myLeftHS = this.input.T;


    //d_weights1 = np.dot(self.input.T,  (np.dot(2*(self.y - self.output) * genie_sigmoid_derivative(self.output), self.weights2.T) * genie_sigmoid_derivative(self.layer1)))

    console.log("layer1 ");
	console.log(this.layer1);

    this.gsd_lay1 = genie_sigmoid_d2(this.layer1);

    this.gsd_out1 = genie_sigmoid_d1(this.output);

    this.w2T = this.weights2.T;
    console.log("w2T ");
	console.log(this.w2T);

    console.log("y ");
	console.log(this.y);
	console.log("output ");
	console.log(this.output);


    this.yMinusOut = this.y.subtract(this.output);

	console.log("yMinusOut ");
	console.log(this.yMinusOut);
    this.myones_11 = nj.ones([8,1]);
	this.myones_22 = nj.ones([8,1]);
	this.mytwos_22 = this.myones_22.add(this.myones_11);

	console.log("mytwos_22 ");
	console.log(this.mytwos_22);


	this.twos_times_minus = this.mytwos_22.multiply(this.yMinusOut);

	console.log("twos_times_minus ");
	console.log(this.twos_times_minus);


	this.littleLHS = this.twos_times_minus.multiply(this.gsd_out1);

	this.littleDot = nj.dot(this.littleLHS,this.w2T);

	this.myRightHS = this.littleDot.multiply(this.gsd_lay1);
    //this.myRightHS = nj.dot(2*(this.y - this.output) * genie_sigmoid_derivative(this.output), this.weights2.T) * genie_sigmoid_derivative(this.layer1);
    //this.d_weights1_all = nj.dot(this.input.T,  (nj.dot(2*(this.y - this.output) * genie_sigmoid_derivative(this.output), this.weights2.T) * genie_sigmoid_derivative(this.layer1)));


	this.d_weights1 = nj.dot(this.myLeftHS, this.myRightHS);


	console.log(this.weights1);
	console.log(this.d_weights1);	
	console.log(this.weights2);
	console.log(this.d_weights2);


	this.neww1 = this.weights1.add(this.d_weights1);
    this.weights1 = this.neww1;



    this.neww2 = this.weights2.add(this.d_weights2);
    this.weights2 = this.neww2;
	console.log(this.weights1);
	console.log(this.weights2);

  }

}



async function fetchData(id) {
	const url = `http://127.0.0.1:4096/api/transactions?type=0&id=${id}`;
	const response = await axios.get(url);
	        console.log("hi fetchData  ");

	return response.data.transactions[0].message;
}

function formatter(data) {
	const msg = data.split(/,|\n/).slice(0, 24);
	return nj.array(msg.map(n => Number(n))).reshape([8, 3]);
		        console.log("hi formatter  ");

}

(async () => {
	const id = '0f4f574fd21b7a608631136ff1c008767b919b18bca40f853f6be1c33400a533';
	const data = await fetchData(id);
	const X = formatter(data);
	console.log(X);
	const y = nj.array(
		[[0],[1],[1],[0], [0],[1],[1],[0]]
		)
	console.log(y);

	const gnn = new GenieDistributedNeuralNetwork(X,y);
        gnn.feedforward();
        gnn.backprop();

        console.log("output1 ");
        console.log(gnn.output1);

        console.log("feedforward2 ");
        gnn.feedforward();
        console.log("backprop2 ");
        gnn.backprop();

        console.log("output2 ");
        console.log(gnn.output2);


        var i;
        for (i = 0; i < 1500; i++) {
	      gnn.feedforward();
	      gnn.backprop();
      } 
      console.log("last.......... ");
      console.log(gnn.output);
      console.log(gnn)
})()









