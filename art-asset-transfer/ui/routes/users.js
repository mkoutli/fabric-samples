var express = require('express');
var router = express.Router();
const api_helper = require('./API_helper');

/* GET userlist. */
router.get('/userlist', function(req, res) {
  console.log('here');
  api_helper.make_API_call('http://127.0.0.1:8081/listAssets')
	.then(response => {
		res.json(response)
	})
	.catch(error => {
		res.send(error)
	})
});

module.exports = router;
