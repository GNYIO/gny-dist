## Principle

Blockchain is a chain of blocks. Each block stores different kind of transacions. In a normal transfer transaction (type=0) , there is a 'message' property which can store extra information of the transaction. 

## Upload data

upload.js 

```javascript
const fs = require('fs');
const axios = require('axios');

const data = fs.readFileSync('./myDataX', 'utf8');  // Read date from file and assign the file content to a variable

axios.put('http://127.0.0.1:4096/api/transactions', {
  "secret": "grow pencil ten junk bomb right describe trade rich valid tuna service", // Master passphrase of genesis account
  "message": data,  // assign data to message property
  "fee": 10000000,  // transaction fee
  "senderId": "G4GDW6G78sgQdSdVAQUXdm5xPS13t", // address of genesis account
  "args": [10000000000, "G2XSqvWsmkZ2n4SgHVxjdX1Jdw2o2"], // the first argument is amount of the transfer, second argument is recipient address
  "type": 0  // transaction type
})
  .then(function (response) {
    console.log(response.data);
  })
  .catch(function (error) {
    console.log(error);
  });
```

When you start the blockchain. Run `node upload.js`, it will look for the `myDataX` file in the folder, and upload the data to the blockchain as a transaction message. You will get a transaction id, please copy and paste it to somewhere.

## Feed data to GNN

```javascript
// Fetch data from the blockchain by transaction id
async function fetchData(id) {
	const url = `http://127.0.0.1:4096/api/transactions?type=0&id=${id}`;
	const response = await axios.get(url);
	return response.data.transactions[0].message;
}

// Format data to a two-dimension array
function formatter(data) {
	const msg = data.split(/,|\n/).slice(0, 12);
	return nj.array(msg.map(n => Number(n))).reshape([4, 3]);
}

(async () => {
	const id = '5b3f8923f72c5d0316334053eb663910804650ffd23a4abc336910fe229c6cf6';
	const data = await fetchData(id);
	const X = formatter(data);
	console.log(X);
	const y = nj.array([[0],[1],[1],[0]])
	console.log(y);

```

Then paste the transaction id to `genie.js`. Run `node genie.js`.