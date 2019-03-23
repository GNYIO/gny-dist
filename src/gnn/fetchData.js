const fs = require('fs');
const axios = require('axios');

const data = fs.readFileSync('./myDataX', 'utf8');


axios.put('http://127.0.0.1:4096/api/transactions', {
  "secret": "grow pencil ten junk bomb right describe trade rich valid tuna service",
  "message": data,
  "fee": 10000000,
  "senderId": "G4GDW6G78sgQdSdVAQUXdm5xPS13t",
  "args": [10000000000, "G2XSqvWsmkZ2n4SgHVxjdX1Jdw2o2"],
  "type": 0
})
  .then(function (response) {
    console.log(response.data);
  })
  .catch(function (error) {
    console.log(error);
  });