const fs = require('fs');
const axios = require('axios');

const filename = process.argv[2]
const data = fs.readFileSync(filename, 'utf8');  // Read date from file and assign the file content to a variable

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
