'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
var parseDN = require('ldapjs').parseDN;
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildCCPOrg2, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const myChannel = 'mychannel';
const myChaincodeName = 'art-private';

const memberAssetCollectionName = 'assetCollection';
const org1PrivateCollectionName = 'Org1MSPPrivateCollection';
const org2PrivateCollectionName = 'Org2MSPPrivateCollection';
const mspOrg1 = 'Org1MSP';
const mspOrg2 = 'Org2MSP';
const Org1UserId = 'appUser1';
const Org2UserId = 'appUser2';
var walletOrg1=undefined;
var walletOrg2=undefined;
var ccpOrg1 = undefined;
var ccpOrg2 = undefined;

/** ~~~~~~~ Fabric client : Using Org1 identity to Org1 Peer ~~~~~~~ */
var gatewayOrg1 = undefined;
var networkOrg1 = undefined;
var contractOrg1 = undefined;

/** ~~~~~~~ Fabric client : Using Org2 identity to Org2 Peer ~~~~~~~ */
var gatewayOrg2 = undefined;
var networkOrg2 = undefined;
var contractOrg2 = undefined;


//// App /////////////////////
var express = require('express');
var app = express();
var fs = require("fs");
const bodyParser = require('body-parser');
const cors = require('cors');

var server = app.listen(8082, function () {
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
    let org = req.query.org;
    getAllAssets(org).then((value) => res.json(JSON.parse(value)))
   
});

// asset
app.get('/getAsset', (req, res)=> {
let org = req.query.org;
let id = req.query.id;
getAsset(org, id).then((value) => res.json(JSON.parse(value)))
});

// private data
app.get('/getAssetPrivateData', (req, res)=> {
    let org = req.query.org;
    let id = req.query.id;
    getAssetPrivateData(org, id).then((value) => res.json(JSON.parse(value)))
   
});

// Read Transfer Agreement of asset
app.get('/getAssetTransferAgreement', (req, res)=> {
    let org = req.query.org;
    let id = req.query.id;
    getAssetTransferAgreement(org, id).then((value) => res.json(JSON.parse(value)))
   
});

// POST //
// Create an asset
 app.post('/createAsset', (req, res)=> {
    var newAsset = req.body;
    let org = req.query.org;
    console.log(newAsset); 
    createAsset(newAsset, org).then((value) => res.json(JSON.parse(value)))
   
});

// agree to transfer
 app.post('/agreeToTransfer', (req, res)=> {
    var agreement = req.body;
    let org = req.query.org;
    console.log(agreement); 
    agreeToTransfer(agreement, org).then((value) => res.json(JSON.parse(value)))
   
});

 // Transfer Asset
 app.post('/transferAsset', (req, res)=> {
    let org = req.query.org;
    var bod = req.body;
    transferAsset(org, bod).then((value) => res.json(JSON.parse(value)))
   
});


function prettyJSONString(inputString) {
    if (inputString) {
        return JSON.stringify(JSON.parse(inputString), null, 2);
    }
    else {
        return inputString;
    }
}

async function initContractFromOrg1Identity() {
    console.log('\n--> Fabric client user & Gateway init: Using Org1 identity to Org1 Peer');
    // build an in memory object with the network configuration (also known as a connection profile)
    ccpOrg1 = buildCCPOrg1();

    // build an instance of the fabric ca services client based on
    // the information in the network configuration
    const caOrg1Client = buildCAClient(FabricCAServices, ccpOrg1, 'ca.org1.example.com');

    // setup the wallet to cache the credentials of the application user, on the app server locally
    const walletPathOrg1 = path.join(__dirname, 'wallet/org1');
    walletOrg1 = await buildWallet(Wallets, walletPathOrg1);

    // in a real application this would be done on an administrative flow, and only once
    // stores admin identity in local wallet, if needed
    await enrollAdmin(caOrg1Client, walletOrg1, mspOrg1);
    // register & enroll application user with CA, which is used as client identify to make chaincode calls
    // and stores app user identity in local wallet
    // In a real application this would be done only when a new user was required to be added
    // and would be part of an administrative flow
    await registerAndEnrollUser(caOrg1Client, walletOrg1, mspOrg1, Org1UserId, 'org1.department1');

    try {
        // Create a new gateway for connecting to Org's peer node.
        const gatewayOrg1 = new Gateway();
        //connect using Discovery enabled
        await gatewayOrg1.connect(ccpOrg1,
            { wallet: walletOrg1, identity: Org1UserId, discovery: { enabled: true, asLocalhost: true } });

        return gatewayOrg1;
    } catch (error) {
        console.error(`Error in connecting to gateway: ${error}`);
        process.exit(1);
    }
}

async function initContractFromOrg2Identity() {
    console.log('\n--> Fabric client user & Gateway init: Using Org2 identity to Org2 Peer');
    ccpOrg2 = buildCCPOrg2();
    const caOrg2Client = buildCAClient(FabricCAServices, ccpOrg2, 'ca.org2.example.com');

    const walletPathOrg2 = path.join(__dirname, 'wallet/org2');
    walletOrg2 = await buildWallet(Wallets, walletPathOrg2);

    await enrollAdmin(caOrg2Client, walletOrg2, mspOrg2);
    await registerAndEnrollUser(caOrg2Client, walletOrg2, mspOrg2, Org2UserId, 'org2.department1');

    try {
        // Create a new gateway for connecting to Org's peer node.
        const gatewayOrg2 = new Gateway();
        await gatewayOrg2.connect(ccpOrg2,
            { wallet: walletOrg2, identity: Org2UserId, discovery: { enabled: true, asLocalhost: true } });

        return gatewayOrg2;
    } catch (error) {
        console.error(`Error in connecting to gateway: ${error}`);
        process.exit(1);
    }
}

// main function to initialize the network assets
async function main() {
    try {

        /** ******* Fabric client init: Using Org1 identity to Org1 Peer ********** */
         gatewayOrg1 = await initContractFromOrg1Identity();
         networkOrg1 = await gatewayOrg1.getNetwork(myChannel);
         contractOrg1 = networkOrg1.getContract(myChaincodeName);
        // Since this sample chaincode uses, Private Data Collection level endorsement policy, addDiscoveryInterest
        // scopes the discovery service further to use the endorsement policies of collections, if any
        contractOrg1.addDiscoveryInterest({ name: myChaincodeName, collectionNames: [memberAssetCollectionName, org1PrivateCollectionName] });

        /** ~~~~~~~ Fabric client init: Using Org2 identity to Org2 Peer ~~~~~~~ */
         gatewayOrg2 = await initContractFromOrg2Identity();
         networkOrg2 = await gatewayOrg2.getNetwork(myChannel);
         contractOrg2 = networkOrg2.getContract(myChaincodeName);
        contractOrg2.addDiscoveryInterest({ name: myChaincodeName, collectionNames: [memberAssetCollectionName, org2PrivateCollectionName] });
        
        try {
            // Sample transactions are listed below
            // Add few sample Assets & transfers one of the asset from Org1 to Org2 as the new owner
            let assetID1 = 'asset1';
            let assetID2 = 'asset2';
            let assetID3 = 'asset3';
            const assetType1 = 'Painting';
            const assetType2 = 'Sculpture';
            let result;
            let asset1Data = { objectType: assetType1, assetID: assetID1, artWork: 'The Walk', artist: 'Claude Monet', appraisedValue: 2200 };
            let asset2Data = { objectType: assetType1, assetID: assetID2, artWork: 'Les saltimbanques', artist: 'Pablo Picasso', appraisedValue: 45000 };
            let asset3Data = { objectType: assetType2, assetID: assetID3, artWork: 'Woman s Head, Crowned with Flowers', artist: 'Pablo Picasso', appraisedValue: 53000 };

            console.log('\n**************** As Org1 Client ****************');
            console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
            let exists = await contractOrg1.evaluateTransaction('AssetExists', assetID1);
            console.log(`*** Asset 1 Exists: ${prettyJSONString(exists.toString())}`);

            if (exists.toString()==='false'){
                console.log('Adding Assets to work with:\n--> Submit Transaction: CreateAsset ' + assetID1);
                let statefulTxn = contractOrg1.createTransaction('CreateAsset');
                //if you need to customize endorsement to specific set of Orgs, use setEndorsingOrganizations
                //statefulTxn.setEndorsingOrganizations(mspOrg1);
                let tmapData = Buffer.from(JSON.stringify(asset1Data));
                statefulTxn.setTransient({
                    asset_properties: tmapData
                });
                result = await statefulTxn.submit();
            }
            

            //Add asset2
            exists = await contractOrg1.evaluateTransaction('AssetExists', assetID2);
            console.log(`*** Asset 2 Exists: ${prettyJSONString(exists.toString())}`);

            if (exists.toString()==='false'){
                console.log('\n--> Submit Transaction: CreateAsset ' + assetID2);
                let statefulTxn = contractOrg1.createTransaction('CreateAsset');
                let tmapData = Buffer.from(JSON.stringify(asset2Data));
                statefulTxn.setTransient({
                    asset_properties: tmapData
                });
                result = await statefulTxn.submit();
            }


            // console.log('\n--> Evaluate Transaction: GetAssetByRange asset0-asset9');
            // // GetAssetByRange returns assets on the ledger with ID in the range of startKey (inclusive) and endKey (exclusive)
            // result = await contractOrg1.evaluateTransaction('GetAssetByRange', 'asset0', 'asset9');
            // console.log('  result: ' + prettyJSONString(result.toString()));


            console.log('\n**************** As Org2 Client ****************');
            exists = await contractOrg2.evaluateTransaction('AssetExists', assetID3);
            console.log(`*** Asset 3 Exists: ${prettyJSONString(exists.toString())}`);
            

            if (exists.toString()==='false'){
                console.log('Adding Assets to work with:\n--> Submit Transaction: CreateAsset ' + assetID3);
                let statefulTxn = contractOrg2.createTransaction('CreateAsset');
                //if you need to customize endorsement to specific set of Orgs, use setEndorsingOrganizations
                //statefulTxn.setEndorsingOrganizations(mspOrg1);
                let tmapData = Buffer.from(JSON.stringify(asset3Data));
                statefulTxn.setTransient({
                    asset_properties: tmapData
                });
                result = await statefulTxn.submit();
            }


            console.log('\n--> Evaluate Transaction: GetAssetByRange asset0-asset9');
            // GetAssetByRange returns assets on the ledger with ID in the range of startKey (inclusive) and endKey (exclusive)
            result = await contractOrg2.evaluateTransaction('GetAssetByRange', 'asset0', 'asset9');
            console.log('  result: ' + prettyJSONString(result.toString()));
        } catch (error)  {
            console.error(`Error in transaction: ${error}`);
        }

    } catch (error) {
        console.error(`Error in transaction: ${error}`);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

async function getAllAssets(org) {
    let result = undefined;
    
    if (org==1){
        try {
            console.log('\n--> Evaluate Transaction: GetAssetByRange asset0-asset9');
            // GetAssetByRange returns assets on the ledger with ID in the range of startKey (inclusive) and endKey (exclusive)
            result = await contractOrg1.evaluateTransaction('GetAssetByRange', 'asset0', 'asset9');
            console.log('  result: ' + prettyJSONString(result.toString()));
            
        } catch (error) {
            console.error(`Error: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
    } else if (org=2){
        try {
            console.log('\n--> Evaluate Transaction: GetAssetByRange asset0-asset9');
            // GetAssetByRange returns assets on the ledger with ID in the range of startKey (inclusive) and endKey (exclusive)
            result = await contractOrg2.evaluateTransaction('GetAssetByRange', 'asset0', 'asset9');
            console.log('  result: ' + prettyJSONString(result.toString()));
            
        } catch (error) {
            console.error(`Error: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
    } else {
        return '{"msg":"Error!Org does not exist!"}';
    }

    
    
    return result.toString();

}


async function getAssetPrivateData(org, id){
    let result = undefined;
    var orgPrivateCollectionName = undefined;
    if (org==1){
        orgPrivateCollectionName = org1PrivateCollectionName

        try {
            console.log('\n--> Evaluate Transaction: ReadAssetPrivateDetails');
            // ReadAssetPrivateDetails reads data from Org's private collection: Should return empty if it doesn't own it
            result = await contractOrg1.evaluateTransaction('ReadAssetPrivateDetails', orgPrivateCollectionName, id);
            console.log('  result: ' + prettyJSONString(result.toString()));
            if (result == null || result == ''){
                console.log('[]');
                return '[]';
            }  
        } catch (error) {
            console.error(`Error: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        }

    } else if (org=2){
        orgPrivateCollectionName = org2PrivateCollectionName

        try {
            console.log('\n--> Evaluate Transaction: ReadAssetPrivateDetails');
            // ReadAssetPrivateDetails reads data from Org's private collection: Should return empty if it doesn't own it
            result = await contractOrg2.evaluateTransaction('ReadAssetPrivateDetails', orgPrivateCollectionName, id);
            console.log('  result: ' + prettyJSONString(result.toString()));
            if (result == null || result == ''){
                console.log('[]');
                return '[]';
            }  
        } catch (error) {
            console.error(`Error: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        }

    } else {
        return '{"msg":"Error!Org does not exist!"}';
    }
     
    return result.toString();
}

async function getAssetTransferAgreement(org, id){
    let result = undefined;
    
    if (org==1){
       try {
            console.log('\n--> Evaluate Transaction: ReadTransferAgreement ' + id);
            result = await contractOrg1.evaluateTransaction('ReadTransferAgreement', id);
            console.log('  result: ' + prettyJSONString(result.toString()));
            if (result == null || result == ''){
                console.log('[]');
                return '[]';
            }
            
        } catch (error) {
            console.error(`Error in connecting to gateway: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
        
    } else if (org=2){
        try {
            console.log('\n--> Evaluate Transaction: ReadTransferAgreement ' + id);
            result = await contractOrg2.evaluateTransaction('ReadTransferAgreement', id);
            console.log('  result: ' + prettyJSONString(result.toString()));
            if (result == null || result == ''){
                console.log('[]');
                return '[]';
            }
            
        } catch (error) {
            console.error(`Error in connecting to gateway: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
        
    } else {
        return '{"msg":"Error!Org does not exist!"}';
    }


    return result.toString();
}


async function getAsset(org, id){
    let result = undefined;
    
    if (org==1){
        try {
            console.log('\n--> Evaluate Transaction: ReadAsset');
            // ReadAsset reads data from Org's private collection: Should return empty if it doesn't own it
            result = await contractOrg1.evaluateTransaction('ReadAsset', id);
            console.log('  result: ' + prettyJSONString(result.toString()));
            if (result == null || result == ''){
                console.log('[]');
                return '[]';
            }
            
        } catch (error) {
            console.error(`Error in connecting to gateway: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        }
        
    } else if (org=2){
        try {
            console.log('\n--> Evaluate Transaction: ReadAsset');
            // ReadAsset reads data from Org's private collection: Should return empty if it doesn't own it
            result = await contractOrg2.evaluateTransaction('ReadAsset', id);
            console.log('  result: ' + prettyJSONString(result.toString()));
            if (result == null || result == ''){
                console.log('[]');
                return '[]';
            }
            
        } catch (error) {
            console.error(`Error in connecting to gateway: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        }
        
    } else {
        return '{"msg":"Error!Org does not exist!"}';
    }

    
     
    return result.toString();
}


async function createAsset(newAsset, org){
    // parse body json
    var id = newAsset.ID;
    var col = newAsset.ArtWork;
    var type = newAsset.objectType;
    var siz = newAsset.Artist;
    var value = newAsset.appraisedValue;
    console.log(id, col, siz, type, value);
    let assetData = { objectType: type, assetID: id, artWork: col, artist: siz, appraisedValue: value };

    let result = undefined;
    
    if (org==1){
        try { 
            let exists = await contractOrg1.evaluateTransaction('AssetExists', id);
            console.log(`*** Asset Exists: ${prettyJSONString(exists.toString())}`);
            if (exists.toString()==='false'){
                console.log('-> Submit Transaction: CreateAsset ' + id);
                let statefulTxn = contractOrg1.createTransaction('CreateAsset');
                //if you need to customize endorsement to specific set of Orgs, use setEndorsingOrganizations
                //statefulTxn.setEndorsingOrganizations(mspOrg1);
                let tmapData = Buffer.from(JSON.stringify(assetData));
                statefulTxn.setTransient({
                    asset_properties: tmapData
                });
                result = await statefulTxn.submit();
            } else {
                return '{"msg":"exists"}'
            }
            if (result == null || result == ''){
                console.log('Request successfully submitted');
                return '{"msg" : "Request successfully submitted"}';
            }
            
        } catch (error) {
            console.error(`Error: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
    } else if (org=2){
        try { 
            let exists = await contractOrg2.evaluateTransaction('AssetExists', id);
            console.log(`*** Asset Exists: ${prettyJSONString(exists.toString())}`);
            if (exists.toString()==='false'){
                console.log('-> Submit Transaction: CreateAsset ' + id);
                let statefulTxn = contractOrg2.createTransaction('CreateAsset');
                //if you need to customize endorsement to specific set of Orgs, use setEndorsingOrganizations
                //statefulTxn.setEndorsingOrganizations(mspOrg1);
                let tmapData = Buffer.from(JSON.stringify(assetData));
                statefulTxn.setTransient({
                    asset_properties: tmapData
                });
                result = await statefulTxn.submit();
            } else {
                return '{"msg":"exists"}'
            }
            if (result == null || result == ''){
                console.log('Request successfully submitted');
                return '{"msg" : "Request successfully submitted"}';
            }
            
        } catch (error) {
            console.error(`Error: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
    } else {
        return '{"msg":"Error!Org does not exist!"}';
    }

    
    return result.toString();
}


async function agreeToTransfer(agr, org){
    // parse body json
    var id = agr.ID;
    var value = agr.appraisedValue;
    console.log(id, value);
    let dataForAgreement = {  assetID: id, appraisedValue: value };

    let result = undefined;
    
    if (org==1){
        try {
            console.log('\n--> Submit Transaction: AgreeToTransfer payload ' + JSON.stringify(dataForAgreement));
            let statefulTxn = contractOrg1.createTransaction('AgreeToTransfer');
            let tmapData = Buffer.from(JSON.stringify(dataForAgreement));
            statefulTxn.setTransient({
                asset_value: tmapData
            });
            result = await statefulTxn.submit();
            
            if (result == null || result == ''){
                console.log('Request successfully submitted');
                return '{"msg" : "Request successfully submitted"}';
            }
            
        } catch (error) {
            console.error(`Error : ${error}`);
            return `{"msg":"${error}"}`;
        }
    } else if (org=2){
        try {
            console.log('\n--> Submit Transaction: AgreeToTransfer payload ' + JSON.stringify(dataForAgreement));
            let statefulTxn = contractOrg2.createTransaction('AgreeToTransfer');
            let tmapData = Buffer.from(JSON.stringify(dataForAgreement));
            statefulTxn.setTransient({
                asset_value: tmapData
            });
            result = await statefulTxn.submit();
            
            if (result == null || result == ''){
                console.log('Request successfully submitted');
                return '{"msg" : "Request successfully submitted"}';
            }
            
        } catch (error) {
            console.error(`Error in connecting to gateway: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        }
    } else {
        return '{"msg":"Error!Org does not exist!"}';
    }

    
     
    return result.toString();
}

async function transferAsset(org, bod){
    // parse body json
    var id = bod.assetID;
    var buyer = bod.buyerID;
    var decodedString = Buffer.from(buyer, 'base64').toString();
    decodedString = decodedString.substring(6);
    var dn = parseDN(decodedString);
    var cn = dn.rdns[0].attrs.cn.value;
    console.log('Buyer:', cn);
    var mspOrg= undefined;
    if (cn==='appUser1'){
        mspOrg= mspOrg1;
    } else if (cn==='appUser2'){
        mspOrg= mspOrg2;
    }

    let result = undefined;
    let buyerDetails = { assetID: id, buyerMSP: mspOrg };
    
    if (org==1){
        try {
            console.log('\n--> Attempt Submit Transaction: TransferAsset ' + id);
            let statefulTxn = contractOrg1.createTransaction('TransferAsset');
            let tmapData = Buffer.from(JSON.stringify(buyerDetails));
            statefulTxn.setTransient({
                asset_owner: tmapData
            });
            result = await statefulTxn.submit();
            
            if (result == null || result == ''){
                console.log('Request successfully submitted');
                return '{"msg" : "Request successfully submitted"}';
            }
            
        } catch (error) {
            console.error(`Error in connecting to gateway: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
        
    } else if (org=2){
        try {
            console.log('\n--> Attempt Submit Transaction: TransferAsset ' + id);
            let statefulTxn = contractOrg2.createTransaction('TransferAsset');
            let tmapData = Buffer.from(JSON.stringify(buyerDetails));
            statefulTxn.setTransient({
                asset_owner: tmapData
            });
            result = await statefulTxn.submit();
            
            if (result == null || result == ''){
                console.log('Request successfully submitted');
                return '{"msg" : "Request successfully submitted"}';
            }
            
        } catch (error) {
            console.error(`Error in connecting to gateway: ${error}`);
            return `{"msg":"Error - ${error}"}`;
        } 
        
    } else {
        return '{"msg":"Error!Org does not exist!"}';
    }

    
    return result.toString();
}



process.on('SIGINT', function() {
    console.log("Stopping..");
    gatewayOrg1.disconnect();
    gatewayOrg2.disconnect();
    process.exit(1);
});

main();