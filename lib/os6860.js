const request = require('request');
const Rx = require('rxjs');


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
        return new Promise((resolve, reject) => {
                let path = "/auth/?&username=" + encodeURIComponent(this.username) + "&password=" + encodeURIComponent(this.password);
                request.get({
                    url: this.url + path,
                    headers: this.osHeaders,
                    rejectUnauthorized: false,
                }, (err, response, body) => {
                    if (err) {
                        return reject(err);
                    }
                    let data = JSON.parse(body).result;
                    if (data == null) {
                        return reject("dataNull error");
                    }
                    if (data.diag !== 200) {
                        return reject(data.error);
                    }
                    this.OScookie = response.headers['set-cookie'];
                    resolve(true);
                });

        })
    }

    logout() {
        return new Promise((resolve, reject) => {
            let path = "/auth/?";
            request.get({
                url: this.url + path,
                headers: this.osHeaders,
                rejectUnauthorized: false,
            }, (err, response, body) => {
                if (err) {
                    reject(err);
                }
                let data = JSON.parse(body).result;
                if (data.diag !== 200) {
                    reject(data.error);
                }
                this.osHeaders.Cookie = "";
                resolve(true);
            });
        });
    }

    getSNMP(data) {
        return new Promise((resolve, reject) => {
            this.osHeaders.Cookie = this.OScookie;
            var mibObjects = "";
            data.snmp.mibObjects.forEach(function (item, index, array) {
                mibObjects += (index == 0 ? "?" : "&") + "mibObject" + String(index) + "=" + encodeURIComponent(item);
            });
            const path = "/mib/" + encodeURIComponent(data.snmp.table) + mibObjects;
            request.get({
                url: this.url + path,
                headers: this.osHeaders,
                rejectUnauthorized: false,
            }, (err, response, body) => {
                if (err) {
                    reject(err);
                }
                let data = JSON.parse(body).result;
                if (data.diag != 200) {
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
                    reject(err);
                }
                let data = JSON.parse(body).result;
                if (data.diag != 200) {
                    reject(data.error);
                }
                resolve(data);
            });
        });
    }

}

module.exports = {
    OS6860: OS6860,
};
