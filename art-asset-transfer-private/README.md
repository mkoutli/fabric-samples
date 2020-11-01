### To install the app and fabric-specific components

Create a folder and `cd` into that folder (which is currently empty)

Clone repo: `git clone https://github.com/mkoutli/fabric-samples.git`

Then install the Hyperledger Fabric platform-specific binaries and config files for the the latest production releases into the /bin and /config directories of fabric-samples (Fabric v2.2.1 and Fabric CA v1.4.9)
```bash
curl -sSL https://bit.ly/2ysbOFE | bash -s
```
### To run the network

Navigate to the test-network subdirectory within your local clone of the fabric-samples repository.
```bash
cd fabric-samples/test-network
```

If you already have a test network running, bring it down to ensure the environment is clean.
```bash
./network.sh down
```

From the test-network directory, you can use the following command to start up the Fabric test network with Certificate Authorities and CouchDB
```bash
./network.sh up createChannel -ca -s couchdb
```

Export GOPATH
```bash
GOPATH=$HOME/go
```

Use the test network script to deploy the smart contract to the channel
```bash
./network.sh deployCC -ccn art-private -ccep "OR('Org1MSP.peer','Org2MSP.peer')" -cccg ../art-asset-transfer-private/chaincode-go/collections_config.json
```
### Run the app
```bash
cd ../art-asset-transfer-private/application-js
```
If you are running the app for the first time execute `npm install` in order to install the dependencies

Make sure to delete the "wallet" folder which is created if you have run the app in the past with a different instance of the network

```bash
node app.js
```

### Troubleshooting

When starting the app `node app.js` if you get the following error:
```bash
2020-11-01T16:19:26.879Z - error: [DiscoveryService]: send[mychannel] - Channel:mychannel received discovery error:access denied
Error in transaction: Error: DiscoveryService: mychannel error: access denied
Error: DiscoveryService: mychannel error: access denied
    at DiscoveryService.send (/home/mkoutli/Fabric_mk/fabric-samples/art-asset-transfer-private/application-js/node_modules/fabric-common/lib/DiscoveryService.js:345:11)
    at process._tickCallback (internal/process/next_tick.js:68:7)
```
delete the wallet directory and repeat.
