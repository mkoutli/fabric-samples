### To install the app and fabric-specific components

Create a new folder and `cd` into that folder (which is currently empty)

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
Launch the Fabric test network using the network.sh shell script.
```bash
./network.sh up createChannel -c mychannel -ca
```
Next, let’s deploy the chaincode by calling the ./network.sh script with the chaincode name and language options.
```bash
./network.sh deployCC -ccn basic -ccl javascript
```
### To run the app
```bash
cd ../art-asset-transfer/application-js
```
If you are running the app for the first time execute `npm install` in order to install the dependencies

Make sure to delete the "wallet" folder which is created if you have run the app in the past with a different instance of the network
```bash
node app.js
```
### To run the UI
```bash
cd ../ui
```
If you are running the app for the first time execute `npm install` in order to install the dependencies
```bash
npm start
```
