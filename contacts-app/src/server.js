const Express = require ("express");
const GraphHttp = require ("express-graphql");
const Schema = require("./schema.js");
const bodyParser = require('body-parser');
const httpRequest = require('request-promise-native');

const APP_PORT = process.env.APP_PORT;

const app = Express();

//const commerceHost = "https://electronics.demo.cluster.kyma.cx";

var jsonParser = bodyParser.json();

const bodParserOptions = {
    type: '*/*'
};

app.use('/graphql', GraphHttp({
    schema: Schema.schema,
    pretty: true,
    graphiql: true
}));

app.post('/events', bodyParser.raw(bodParserOptions), async function(req, res) {
        console.log('Event received');
        var event = await parseEvent(req, res);
        var customer = await getCommerceCustomer(event.data.customerUid);
        console.log("Customer = " + JSON.stringify(customer));
        createCustomer(customer);
        return customer;
    }
);

app.listen(APP_PORT, () => {
    console.log(`Server started on port ${APP_PORT}`);
});

async function parseEvent(req, res)
{
    let data = req.body;
    console.log("data = " + data);
    if (req.body.length > 0) {
        if (req.get('content-type') === 'application/json') {
            data = JSON.parse(req.body.toString('utf-8'));
            console.log('Event data = ' + JSON.stringify(data));
        } else {
            data = req.body.toString('utf-8');
            console.log('Event data = ' + data);
        }
    }
    
    const event = {
            'event-type': req.get('event-type'),
            'event-id': req.get('event-id'),
            'event-time': req.get('event-time'),
            'event-namespace': req.get('event-namespace'),
            data,
            'extensions': { request: req, response: res },
    };
    return event;
}

/**
 * 
 * @param {*} customerId 
 * @param {*} token 
 */
async function getCommerceCustomer(customerId)
{
    var token;
    //token = await getOAuthTokenIfExpired(token);
    var url = `${process.env.GATEWAY_URL}/electronics/users/${customerId}`;
    
    //commerceHost + "/rest/v2/" + 
    console.log("URL = " +  url);
    //console.log("token = " + JSON.stringify(token));
    return await httpRequest({ 
        url: url, 
        method: 'GET',
        json: true,
        // auth: {
        //     'bearer': token.access_token
        // },
        timeout: 120000 });
}

async function createCustomer(comCustomer)
{
    return Schema.contacts.create({
        firstName: comCustomer.firstName,
        lastName : comCustomer.lastName,
        email: comCustomer.uid
    });
}
/**
 * get an oauth token
 */
async function getOAuthTokenIfExpired(currentToken)
{
  if (currentToken != null)
  {
    console.log("currentToken = " + currentToken);
    var decoded = jwt.decode(currentToken.access_token);
    var expiryDate = decoded.exp;
  }

  if (currentToken == null || parseFloat(expiryDate) >= (Date.now() / 1000))
  {
    console.log("getting new token");
    var token = await httpRequest({
    url: commerceHost + "/authorizationserver/oauth/token",
    method: 'POST',
    json: true,
    form: {
      'grant_type': 'client_credentials',
      'client_id' : 'servicefactory',
      'client_secret' : 'secret'
    }
  });
    console.log("oauth token = " + token);
    return token;
  }
  else
  {
    console.log("returning current token");
    return currentToken;
  }
  }