//TODO move all socket functions to outside socket handler so they can't be modified

function authPool(authTimeout) { //class to represent authkeys
    if (typeof authTimeout == "undefined") {
        console.error("[NODE_UTILS] AuthTimeout not passed into creation of authPool, defaulting");
        authTimeout = 3600;
    }
    this.auth_keys = [];
    this.authTimeout = authTimeout;
    var _this = this;
    this.key = function() {
        this.key = "";
        this.timestamp = "";
        this.lastaccessed = "";
        this.properties = {}; //properties object
        this.init = function(){
            this.key = generateUUID();
            var ts = (new Date()).getTime();
            this.timestamp = ts;
            this.lastaccessed = ts+1;
            if (_this.auth_keys.length > 1000) { //set hardcoded limit for authkey max to prevent DDOS attacks or other similar attacks
                console.error("[NODE_UTILS] AuthkeyDB overflow, resetting (SHOULD NOT HAPPEN)")
                _this.auth_keys = [];
            }
            _this.auth_keys.push(this); //need the _this refrence because "this" changes to refrence key not authPool
        }
        this.is_valid = function(){
            if (this.lastaccessed-this.timestamp < _this.authTimeout) {
                return true;
            } else {
                return false;
            }
        }
        this.update = function(){
            this.lastaccessed = (new Date()).getTime();
        }
    }
    this.validateKey = function(key) {
        var ok = false;
        //console.log("[NODE_UTILS] authkeys: "+JSON.stringify(_this.auth_keys));
        for (var i=0; i<_this.auth_keys.length; i++) {
            if (_this.auth_keys[i].key == key) {
                if (_this.auth_keys[i].is_valid()) {
                    ok = true;
                } else {
                    console.log("[NODE_UTILS] Found invalid authkey, timeout")
                }
            }
        }
        return ok;
    }
    this.findKey = function(key) {
        //console.log("[NODE_UTILS] authkeys: "+JSON.stringify(_this.auth_keys)+", needle: "+key);
        for (var i=0; i<_this.auth_keys.length; i++) {
            if (_this.auth_keys[i].key == key) {
                return _this.auth_keys[i];
                console.log("found authkey")
            }
        }
        return null;
    }
}

function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

var socketHandler = function(uPool,sPool){ //socket functions
    if (typeof uPool == "undefined") {
        console.error("[UTILS] socketHandler initialiazed with undefined userPool");
    }
    if (typeof sPool == "undefined") {
        console.error("[UTILS] socketHandler initialiazed with undefined socketPool");
    }
    this.uPool = uPool;
    this.sPool = sPool;
    this.socketEmitToPython = function(name,data){
        if (this.validateUsers(this.uPool) && this.validateSockets(this.sPool)) {
            if (this.validateData([name,data])) {
                var sanitized = this.sanitizeData([name,data]);
                name = sanitized[0];
                data = sanitized[1];
                for (var i=0; i<this.sPool.length; i++) {
                    if (this.sPool[i].type == "python") {
                        this.sPool[i].socket.emit(name, data);
                    }
                }
            } else {
                console.error("[UTILS] Data passed into emitToPython is invalid")
            }
        } else {
            console.error("[UTILS] userPool or socketPool invalid in socketHandler emitToPython")
        }
    }
    this.socketEmitToWeb = function(name,data){
        if (this.validateUsers(this.uPool) && this.validateSockets(this.sPool)) {
            if (this.validateData([name,data])) {
                var sanitized = this.sanitizeData([name,data]);
                name = sanitized[0];
                data = sanitized[1];
                for (var i=0; i<this.sPool.length; i++) {
                    if (this.sPool[i].type == "client") {
                        this.sPool[i].socket.emit(name, data);
                    }
                }
            } else {
                console.error("[UTILS] Data passed into emitToWeb is invalid")
            }
        } else {
            console.error("[UTILS] userPool or socketPool invalid in socketHandler emitToWeb")
        }
    }
    this.socketEmitToKey = function(key,name,data){ //not finished
        if (this.validateUsers(this.uPool) && this.validateSockets(this.sPool)) {
            if (this.validateData([key,name,data])) {
                var sanitized = this.sanitizeData([key,name,data]);
                key = sanitized[0];
                name = sanitized[1];
                data = sanitized[2];
                var keyObj = uPool.findKey(key);
                if (keyObj == null || typeof keyObj == "undefined") {
                    console.error("keyObj undefined");
                    return;
                } else {
                    if (typeof keyObj.properties.socketID === "undefined") {
                        console.error("keyObj socketID undefined");
                        return;
                    } else {
                        for (var i=0; i<this.sPool.length; i++) {
                            if (this.sPool[i].id == keyObj.properties.socketID) {
                                this.sPool[i].socket.emit(name, data);
                                console.log("found key socket emitting now")
                            }
                        }
                    }
                }
            }
        }
    }
    this.socketEmitToID = function(id,name,data){
        if (this.validateUsers(this.uPool) && this.validateSockets(this.sPool)) {
            if (this.validateData([name,data])) {
                var sanitized = this.sanitizeData([id,name,data]);
                id = sanitized[0];
                name = sanitized[1];
                data = sanitized[2];
                for (var i=0; i<this.sPool.length; i++) {
                    if (this.sPool[i].id == id) {
                        this.sPool[i].socket.emit(name, data);
                        console.log("Found SOCKETID and sending now");
                    }
                }
            } else {
                console.error("[UTILS] Data passed into emitToID is invalid")
            }
        } else {
            console.error("[UTILS] userPool or socketPool invalid in socketHandler emitToID")
        }
    }
    this.socketEmitToAll = function(name,data){
        if (this.validateUsers(this.uPool) && this.validateSockets(this.sPool)) {
            if (this.validateData([name,data])) {
                var sanitized = this.sanitizeData([name,data]);
                name = sanitized[0];
                data = sanitized[1];
                for (var i=0; i<this.sPool.length; i++) {
                    this.sPool[i].socket.emit(name, data);
                }
            } else {
                console.error("[UTILS] Data passed into emitToAll is invalid")
            }
        } else {
            console.error("[UTILS] userPool or socketPool invalid in socketHandler emitToAll")
        }
    }
    //non socket functions
    this.validateUsers = function(uPool){ //don't pass in any fake lists, complete check
        var bad = false;
        for (var i=0; i<uPool.length; i++) {
            if (typeof uPool[i] == "undefined") {
                bad = true;
                console.log("upool und")
            } else if (!uPool[i].hasOwnProperty("key")) {
                bad = true;
                console.log("missing key")
            } else if (!uPool[i].hasOwnProperty("is_valid")) {
                bad = true;
                console.log("missing valid")
            }
        }
        return !bad;
    }
    this.validateSockets = function(sPool){
        var bad = false;
        for (var i=0; i<sPool.length; i++) {
            if (typeof sPool[i] == "undefined") {
                bad = true;
                console.log("spool i invund")
            } else if (!sPool[i].hasOwnProperty("socket") || !sPool[i].hasOwnProperty("status") || !sPool[i].hasOwnProperty("id") || !sPool[i].hasOwnProperty("type") || !sPool[i].hasOwnProperty("handler")) {
                console.log("missing prop")
                bad = true;
            }
        }
        return !bad;
    }
    this.validateData = function(data){
        var bad = false;
        for (var i=0; i<data.length; i++) {
            if (typeof data[i] == "undefined") { //add data rules here
                console.log("dataund")
                bad = true;
            }
        }
        return !bad;
    }
    this.sanitizeData = function(data) {
        for (var i=0; i<data.length; i++) {
            if (typeof data[i] == "undefined") {
                console.error("data i undefined")
            } else {
                try {
                    if (typeof data[i] == "object") {
                        data[i] = JSON.parse(JSON.stringify(data[i]).replace(/[^a-z0-9áéíóúñü{}:" \.,_-]/gim,"").trim());
                    } else {
                        data[i] = data[i].replace(/[^a-z0-9áéíóúñü{}:" \.,_-]/gim,"").trim();
                    }
                } catch(e) {
                    console.error("sanitizeData failed, data may be bad")
                }
                
            }
        }
        return data;
    }
    this.update = function(uuPool, ssPool) {
        if (typeof uuPool == "undefined") {
        console.error("[NODE_UTILS] socketHandler initialiazed with undefined userPool");
        } else {
            this.uPool = uuPool;
        }
        if (typeof ssPool == "undefined") {
            console.error("[NODE_UTILS] socketHandler initialiazed with undefined socketPool");
        } else {
            this.sPool = ssPool;
        }
    }
}

var advancedEventListener = function(object,evt) {
    if (typeof object === "undefined") {
        console.error("[NODE_UTILS] Socket undefined in initialization");
        return "error";
    }
    if (typeof evt === "undefined") {
        console.error("[NODE_UTILS] Evt undefined in initialization");
        return "error";
    }
    this.listeners = [];
    var _this = this;
    this.recvData = function(data) {
        var dat = JSON.stringify(data);
        //console.log("recvdata event data: "+((dat.length > 100)?"'data too long to show'":dat)+", list "+JSON.stringify(_this.listeners))
        var nonpersist = [];
        for (var i=0; i<_this.listeners.length; i++) {
            if (_this.listeners[i][0] == data.action || _this.listeners[i][3]) {
                try {
                    if (_this.listeners[i][2] == false || _this.listeners[i][2] == "false") { //non persistent listener
                        nonpersist.push(i); //push it to nonpersist list to remove it later
                    }
                    _this.listeners[i][1](data); //run function
                } catch(e) {
                    console.error("[UTILS] Error running function in listenerRecieve, e: "+e);
                }
            }
        }
        //console.log("nonpersist: "+JSON.stringify(nonpersist))
        for (var i=0; i<nonpersist.length; i++) {
            _this.listeners.splice(nonpersist[i],1);
        }
    }
    this.addListener = function(ev,fn) {
        if (typeof ev !== "string") {
            console.error("[UTILS] AddListener ev type not string");
        } else if (typeof fn !== "function") {
            console.error("[UTILS] AddListener fn type not function");
        } else {
            var ignoreAction = false;
            if (ev == "*") {
                ignoreAction = true;
            }
            this.listeners[this.listeners.length] = [ev,fn,false,ignoreAction];
        }
    }
    this.addPersistentListener = function(ev,fn) {
        if (typeof ev !== "string") {
            console.error("[UTILS] AddListener ev type not string");
        } else if (typeof fn !== "function") {
            console.error("[UTILS] AddListener fn type not function");
        } else {
            var ignoreAction = false;
            if (ev == "*") {
                ignoreAction = true;
            }
            this.listeners[this.listeners.length] = [ev,fn,true,ignoreAction];
        }
    }
    try {
        object.addEventListener(evt,this.recvData); //set up listener on object
    } catch(e) {
        console.warn("[NODE_UTILS] AddEventListener failed, trying addListener");
        try {
            object.addListener(evt,this.recvData);
        } catch(e) {
            console.error("[NODE_UTILS] Failed to create the event");
        }
    }
}

function atob_poly(a) {
    return new Buffer(a, 'base64').toString('binary');
};
function btoa_poly(b) {
    return new Buffer(b).toString('base64');
};

/*module.exports = {
    generateUUID: generateUUID,
    authPool: authPool
};*/
exports.generateUUID = generateUUID;
exports.authPool = authPool;
exports.atob = atob_poly;
exports.btoa = btoa_poly;
exports.socketHandler = socketHandler;
exports.advancedEventListener = advancedEventListener;
