'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'art';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';
var wallet = undefined;;


//// App /////////////////////
var express = require('express');
var app = express();
var fs = require("fs");
const bodyParser = require('body-parser');
const cors = require('cors');

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
})

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// GET ///
// all assets
app.get('/listAssets', (req, res)=> {
	getAllAssets().then((value) => res.json(JSON.parse(value)))
   
});

// asset with id
app.get('/asset', (req, res)=> {
	let id = req.query.id;
	getAsset(id).then((value) => res.json(JSON.parse(value)))
   
});

// PUT //
// Update an asset
 app.put('/updateAsset', (req, res)=> {
 	var updatedAsset = req.body;
 	console.log(updatedAsset); 
	updateAsset(updatedAsset).then((value) => res.json(JSON.parse(value)))
   
});

 // Transfer an asset to another owner
 app.put('/transferAsset', (req, res)=> {
 	var updatedAsset = req.body;
 	console.log(updatedAsset); 
	transferAsset(updatedAsset).then((value) => res.json(JSON.parse(value)))
   
});

 // POST //
// Create an asset
 app.post('/createAsset', (req, res)=> {
 	var newAsset = req.body;
 	console.log(newAsset); 
	createAsset(newAsset).then((value) => res.json(JSON.parse(value)))
   
});


function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();


		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
			// This type of transaction would only be run once by an application the first time it was started after it
			// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
			// an "init" type function.
			console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
			await contract.submitTransaction('InitLedger');
			console.log('*** Result: committed');
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}

	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}


async function getAllAssets() {
	// build an in memory object with the network configuration (also known as a connection profile)
	const ccp = buildCCPOrg1();
	const gateway = new Gateway();
	let result = undefined;
	try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			// Let's try a query type operation (function).
			// This will be sent to just one peer and the results will be shown.
			console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
			result = await contract.evaluateTransaction('GetAllAssets');
			console.log(result.toString());
			
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
		//console.log(result.toString());
		return result.toString();
}

async function updateAsset(updatedAsset) {
	// parse body json
	var id = updatedAsset.id;
	var color = updatedAsset.color;
	var size = updatedAsset.size;
	var owner = updatedAsset.owner;
	var appraisedValue = updatedAsset.appraisedValue;
	console.log(id, color, size, owner, appraisedValue);


	// build an in memory object with the network configuration (also known as a connection profile)
	const ccp = buildCCPOrg1();
	const gateway = new Gateway();
	let result = undefined;
	try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			try {
				// How about we try a transactions where the executing chaincode throws an error
				// Notice how the submitTransaction will throw an error containing the error thrown by the chaincode
				console.log('\n--> Submit Transaction: UpdateAsset');
				result = await contract.submitTransaction('UpdateAsset', id, color, size, owner, appraisedValue);
			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
				return '{"type":"error"}';
			}
			
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
		//console.log(result.toString());
		return result.toString();
}

async function createAsset(newAsset) {
	// parse body json
	var id = newAsset.id;
	var color = newAsset.color;
	var size = newAsset.size;
	var owner = newAsset.owner;
	var appraisedValue = newAsset.appraisedValue;
	console.log(id, color, size, owner, appraisedValue);


	// build an in memory object with the network configuration (also known as a connection profile)
	const ccp = buildCCPOrg1();
	const gateway = new Gateway();
	let result = undefined;
	try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			try {
				console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments');
				result = await contract.submitTransaction('CreateAsset', id, color, size, owner, appraisedValue);
				// The "submitTransaction" returns the value generated by the chaincode. Notice how we normally do not
				// look at this value as the chaincodes are not returning a value. So for demonstration purposes we
				// have the javascript version of the chaincode return a value on the function 'CreateAsset'.
				// This value will be the same as the 'ReadAsset' results for the newly created asset.
				// The other chaincode versions could be updated to also return a value.
				// Having the chaincode return a value after after doing a create or update could avoid the application
				// from making an "evaluateTransaction" call to get information on the asset added by the chaincode
				// during the create or update.
				console.log(`*** Result committed: ${prettyJSONString(result.toString())}`);
			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
				return '{"type":"error"}';
			}
			
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
		//console.log(result.toString());
		return result.toString();

}

async function transferAsset(updatedAsset) {
	// parse body json
	var id = updatedAsset.id;
	var owner = updatedAsset.owner;
	console.log(id, owner);


	// build an in memory object with the network configuration (also known as a connection profile)
	const ccp = buildCCPOrg1();
	const gateway = new Gateway();
	let result = undefined;
	try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			try {
				console.log('\n--> Submit Transaction: TransferAsset with id, to new owner');
				result = await contract.submitTransaction('TransferAsset', id, owner);
				console.log('*** Result: committed');
			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
				return '{"type":"error"}';
			}
			
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
		//console.log(result.toString());
		return result.toString();
}

async function getAsset(id) {

	console.log(id);


	// build an in memory object with the network configuration (also known as a connection profile)
	const ccp = buildCCPOrg1();
	const gateway = new Gateway();
	let result = undefined;
	try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			try {
				console.log('\n--> Evaluate Transaction: ReadAsset, function returns asset attributes');
				result = await contract.evaluateTransaction('ReadAsset', id);
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
				return '{"type":"error"}';
			}
			
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
		//console.log(result.toString());
		return result.toString();
}


main();

