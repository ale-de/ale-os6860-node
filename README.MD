
Welcome to the Alcatel-Lucent Enterprise OS6860 REST API node.
This node allows to perform SNMP GET commands or CLI commands onto the OS6860 via its REST API.
Please refer to the OS6860 SW Manual for further details on usage. 

**Install**

`$ npm install --save ale-os6860-node`

**Usage**

 

```
let Switch = require('ale-os6860-node');

// instantiate the API
let omniswitch = {};
omniswitch[Symbol.iterator] = function* () {
    for (let key in this) {
        yield this[key]
    }
};
omniswitch["192.168.1.1"] = new Switch.OS6860("192.168.1.1", "admin", "switch");
omniswitch["192.168.1.2"] = new Switch.OS6860("192.168.1.2", "admin", "switch");

omniswitch["192.168.1.1"].login().then(function (data) {
    console.log("succesful login");
    getMacTable().then(function (data) {
        console.log("Received mactable", data);
        omniswitch["192.168.1.1"].logout();
    })
}).catch(function (err) {
    console.log("Login to omniswitch failed");
});

function getMacTable(port) {
    return new Promise((resolve, reject) => {
        omniswitch["192.168.1.1"].getSNMP({
            snmp: {
                table: "dot1dTpFdbTable",
                mibObjects: ["dot1dTpFdbAddress", "dot1dTpFdbPort", "dot1dTpFdbStatus"]
            }
        }).then(snmp => {
            let result = [];
            let data = snmp.data.rows;
            for (let key in data) {
                result.push(data[key]);
            }
            if (!port) resolve(result);
            resolve(result.filter(macEntry => {
                return (Number(macEntry.dot1dTpFdbPort) === (port - 1000))
            }))
        }).catch(err => {
            reject("getMacTable " + err);
        })
    });
}```
