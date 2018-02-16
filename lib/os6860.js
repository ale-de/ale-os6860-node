const request = require('request');
const Rx = require('rxjs');
//global.config = require('./config');


class OS6860 {

    constructor(ip, user,password) {
        this.username = user;
        this.password = password;
        this.OScookie = "";
        this.ip = ip;
        this.url = 'https://' + ip;
        this.osHeaders = {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/vnd.alcatellucentaos+json",
            "Cookie": "",
        };
    }

    login() {
        console.log('OmniSwitch Login initiated ...');
        return new Promise((resolve, reject) => {
                let path = "/auth/?&username=" + encodeURIComponent(this.username) + "&password=" + encodeURIComponent(this.password);
                request.get({
                    url: this.url + path,
                    headers: this.osHeaders,
                    rejectUnauthorized: false,
                }, (err, response, body) => {
                    if (err) {
                        console.log('OmniSwitch Login error:', err);
                        return reject(err);
                    }
                    let data = JSON.parse(body).result;
                    //console.log("data:", data, body);
                    if (data == null) {
                        console.log('OmniSwitch Login dataNull response error:');
                        return reject("dataNull error");
                    }
                    if (data.diag !== 200) {
                        console.log('OmniSwitch Login response error:', data.error);
                        return reject(data.error);
                    }
                    this.OScookie = response.headers['set-cookie'];
                    console.log("Login succesful on %s.\nCookie:\n", this.ip, this.OScookie);
                    resolve(true);
                });

        })
    }

    logout() {
        console.log('OmniSwitch Logout ...');
        return new Promise((resolve, reject) => {
            let path = "/auth/?";
            request.get({
                url: this.url + path,
                headers: this.osHeaders,
                rejectUnauthorized: false,
            }, (err, response, body) => {
                if (err) {
                    console.log('OmniSwitch Logout error:', err);
                    reject(err);
                }
                let data = JSON.parse(body).result;
                if (data.diag !== 200) {
                    console.log('OmniSwitch Logout response error:', data.error);
                    reject(data.error);
                }
                console.log("Logged out of %s", this.ip);
                this.osHeaders.Cookie = "";
                resolve(true);
            });
        });
    }

    getSNMP(data) {
        //console.log("getSNMP");
        return new Promise((resolve, reject) => {
            this.osHeaders.Cookie = this.OScookie;
            var mibObjects = "";
            data.snmp.mibObjects.forEach(function (item, index, array) {
                mibObjects += (index == 0 ? "?" : "&") + "mibObject" + String(index) + "=" + encodeURIComponent(item);
            });
            //console.log("ALE-INFO::Getting SNMP from OS Rel 8", mibObjects);
            const path = "/mib/" + encodeURIComponent(data.snmp.table) + mibObjects;
            request.get({
                url: this.url + path,
                headers: this.osHeaders,
                rejectUnauthorized: false,
            }, (err, response, body) => {
                if (err) {
                    console.log('OmniSwitch getSNMP error:', err);
                    reject(err);
                }
                let data = JSON.parse(body).result;
                if (data.diag != 200) {
                    console.log('OmniSwitch getSNMP response error:', data.error);
                    reject(data.error);
                }
                resolve(data);
            });
        });
    }

    sendCLI(cli) {
        return new Promise((resolve, reject) => {
            this.osHeaders.Cookie = this.OScookie;
            const path = "/cli/aos?&cmd=" + cli;
            request.get({
                url: this.url + path,
                headers: this.osHeaders,
                rejectUnauthorized: false,
            }, (err, response, body) => {
                if (err) {
                    console.log('OmniSwitch sendCLI error:', err);
                    reject(err);
                }
                let data = JSON.parse(body).result;
                if (data.diag != 200) {
                    console.log('OmniSwitch sendCLI response error:', data.error);
                    reject(data.error);
                }
                resolve(data);
            });
        });
    }

    flushMACaddr(mac) {
        return new Promise((resolve, reject) => {
            this.sendCLI("unp user flush mac-address " + mac).then(response => {
                console.log("flushMACaddr done", response);
                resolve(true)
            }).catch(err => {
                console.log("flushMACaddr",err);
                reject("flushMACaddr " + err);
            })
        });
    }

    getMacTable(port) {
        //alaSlMacAddressGlobalEntry
        return new Promise((resolve, reject) => {
            this.getSNMP({
                snmp: {
                    table: "dot1dTpFdbTable",
                    mibObjects: ["dot1dTpFdbAddress", "dot1dTpFdbPort", "dot1dTpFdbStatus" ]
                }
            }).then(snmp => {
                let result = [];
                //console.log(snmp);
                let data = snmp.data.rows;
                for (let key in data) {
                    result.push(data[key]);
                }
                console.log("Snmp getMacTable response:", result.length);
                resolve(result.filter(mac=>{console.log(Number(mac.dot1dTpFdbPort),(port-1000));return (Number(mac.dot1dTpFdbPort)===(port-1000))}))
            }).catch(err => {
                console.log("getMacTable",err);
                reject("getMacTable " + err);
            })
        });
    }

    getUNPdeviceInfo() {
        //alaSlMacAddressGlobalEntry
        return new Promise((resolve, reject) => {
                this.getSNMP({
                    snmp: {
                        table: "alaDaMacVlanUserTable",
                        mibObjects: ["alaDaMacVlanUserMACAddress", "alaDaMacVlanUserIpAddress", "alaDaMacVlanUserAuthStatus", "alaDaMacVlanUserUnpUsed"]
                    }
                }).then(snmp => {
                    let result = [];
                    //console.log(snmp);
                    let data = snmp.data.rows;
                    for (let key in data) {
                        result.push(data[key]);
                    }
                    console.log("Snmp getUNPdeviceInfo response for %s:", this.ip, result.length);
                    result = result.filter(dev=>{ return dev.alaDaMacVlanUserAuthStatus==='4' && dev.alaDaMacVlanUserUnpUsed=== (global.config.cnst.DEFAULTROLE||"")}); // && dev.alaDaMacVlanUserUnpUsed=== (global.config.cnst.DEFAULTROLE||"")
                    result.forEach(el=>{
                        el.selected = false;
                        el.switchIp = this.ip;
                        el.alaDaMacVlanUserIpAddress = this.hex2ip(el.alaDaMacVlanUserIpAddress)
                    });
                    console.log("Snmp getUNPdeviceInfo response for %s, filtered:", this.ip, result.length);
                    resolve(result)
                }).catch(err => {
                    console.log("getUNPdeviceInfo", err);
                    reject("getUNPdeviceInfo " + err);
                })
        });
    }

    hex2ip(hexip) {
        let ip = "";
        let x = hexip.split(":");
        x.forEach(y=>{ip = ip + String(parseInt("0x"+y,16)) + "."});
        return ip.substr(0,ip.length-1);
    }

    getFlowTable(ip) {
        //alaAppMonFlowAppGrpName
        //["alaAppMonFlowSourceIPType", "alaAppMonFlowAppName,alaAppMonFlowSourceIP,alaAppMonFlowSrcPort,alaAppMonFlowDestIPType,alaAppMonFlowDestIP,alaAppMonFlowDestPort,alaAppMonFlowProtocol"]
        return new Promise((resolve, reject) => {
            this.getSNMP({
                snmp: {
                    table: "alaAppMonFlowTable",
                    mibObjects: ["alaAppMonFlowAppName", "alaAppMonFlowSourceIP", "alaAppMonFlowSrcPort", "alaAppMonFlowDestIPType", "alaAppMonFlowDestIP", "alaAppMonFlowDestPort", "alaAppMonFlowProtocol"]
                }
            }).then(snmp => {
                let result = [];
                //console.log(snmp);
                let data = snmp.data.rows;
                for (let key in data) {
                    result.push(data[key]);
                }
                //console.log("flows for %s:",this.ip, JSON.stringify(result));
                let result_f = result.filter(flow => {
                    return (flow.alaAppMonFlowDestIP === ip || flow.alaAppMonFlowSourceIP === ip)
                });
                console.log("Snmp getFlowTable response: %d out of %d", result_f.length, result.length);

                // get list of unique IP destinations and apps
                let result2 = {flowdata: result,flows:{}, apps:[]};
                Rx.Observable.from(result_f).subscribe(
                    flow => {
                        if (!result2.flows.hasOwnProperty(flow.alaAppMonFlowDestIP)) result2.flows[flow.alaAppMonFlowDestIP]=0;
                        if (!result2.flows.hasOwnProperty(flow.alaAppMonFlowSourceIP)) result2.flows[flow.alaAppMonFlowSourceIP]=0;
                        result2.flows[flow.alaAppMonFlowDestIP]++;
                        result2.flows[flow.alaAppMonFlowSourceIP]++
                    }
                    , err => {
                        throw("flow destination collection error")
                    }
                    , () => {
                        Rx.Observable.from(result_f).distinct(obj => obj.alaAppMonFlowAppName).subscribe(
                            flow => {
                                //if (!('apps' in result2)) result2['apps']=[];
                                result2.apps.push(flow.alaAppMonFlowAppName);
                            }
                            , err => {
                                throw("flow name collection error")
                            }
                            , () => {
                                console.log("flow data:", result2.apps);
                                resolve(result2);
                            }
                        );
                    }
                );
            }).catch(err => {
                console.log("getFlowTable error:",err);
                reject("getFlowTable " + err);
            })
        });
    }

}

module.exports = {
    OS6860: OS6860,
};
