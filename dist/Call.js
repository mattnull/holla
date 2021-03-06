// Generated by CoffeeScript 1.4.0
(function() {
  var Call, EventEmitter, RTC,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  RTC = require('./RTC');

  EventEmitter = require('emitter');

  Call = (function(_super) {

    __extends(Call, _super);

    function Call(parent, user, isCaller) {
      var _this = this;
      this.parent = parent;
      this.user = user;
      this.isCaller = isCaller;
      this.startTime = new Date;
      this.socket = this.parent.ssocket;
      this.pc = this.createConnection();
      if (this.isCaller) {
        this.socket.write({
          type: "offer",
          to: this.user
        });
      }
      this.emit("calling");
      this.parent.on("answer." + this.user, function(accepted) {
        if (!accepted) {
          return _this.emit("rejected");
        }
        _this.emit("answered");
        return _this.initSDP();
      });
      this.parent.on("candidate." + this.user, function(candidate) {
        return _this.pc.addIceCandidate(new RTC.IceCandidate(candidate));
      });
      this.parent.on("sdp." + this.user, function(desc) {
        desc.sdp = RTC.processSDPIn(desc.sdp);
        _this.pc.setRemoteDescription(new RTC.SessionDescription(desc));
        return _this.emit("sdp");
      });
      this.parent.on("hangup." + this.user, function() {
        return _this.emit("hangup");
      });
      this.parent.on("chat." + this.user, function(msg) {
        return _this.emit("chat", msg);
      });
    }

    Call.prototype.createConnection = function() {
      var pc,
        _this = this;
      pc = new RTC.PeerConnection(RTC.PeerConnConfig, RTC.constraints);
      pc.onconnecting = function() {
        _this.emit('connecting');
      };
      pc.onopen = function() {
        _this.emit('connected');
      };
      pc.onicecandidate = function(evt) {
        if (evt.candidate) {
          _this.socket.write({
            type: "candidate",
            to: _this.user,
            args: {
              candidate: evt.candidate
            }
          });
        }
      };
      pc.onaddstream = function(evt) {
        _this.remoteStream = evt.stream;
        _this._ready = true;
        _this.emit("ready", _this.remoteStream);
      };
      pc.onremovestream = function(evt) {
        console.log("removestream", evt);
      };
      return pc;
    };

    Call.prototype.addStream = function(s) {
      this.pc.addStream(s);
      return this;
    };

    Call.prototype.ready = function(fn) {
      if (this._ready) {
        fn(this.remoteStream);
      } else {
        this.once('ready', fn);
      }
      return this;
    };

    Call.prototype.duration = function() {
      var e, s;
      if (this.endTime != null) {
        s = this.endTime.getTime();
      }
      if (s == null) {
        s = Date.now();
      }
      e = this.startTime.getTime();
      return (s - e) / 1000;
    };

    Call.prototype.chat = function(msg) {
      this.parent.chat(this.user, msg);
      return this;
    };

    Call.prototype.answer = function() {
      this.startTime = new Date;
      this.socket.write({
        type: "answer",
        to: this.user,
        args: {
          accepted: true
        }
      });
      this.initSDP();
      return this;
    };

    Call.prototype.decline = function() {
      this.socket.write({
        type: "answer",
        to: this.user,
        args: {
          accepted: false
        }
      });
      return this;
    };

    Call.prototype.end = function() {
      this.endTime = new Date;
      try {
        this.pc.close();
      } catch (_error) {}
      this.socket.write({
        type: "hangup",
        to: this.user
      });
      this.emit("hangup");
      return this;
    };

    Call.prototype.initSDP = function() {
      var done, err,
        _this = this;
      done = function(desc) {
        desc.sdp = RTC.processSDPOut(desc.sdp);
        _this.pc.setLocalDescription(desc);
        return _this.socket.write({
          type: "sdp",
          to: _this.user,
          args: desc
        });
      };
      err = function(e) {
        throw e;
      };
      if (this.isCaller) {
        return this.pc.createOffer(done, err, RTC.constraints);
      }
      if (this.pc.remoteDescription) {
        return this.pc.createAnswer(done, err, RTC.constraints);
      }
      return this.once("sdp", function() {
        return _this.pc.createAnswer(done, err);
      });
    };

    return Call;

  })(EventEmitter);

  module.exports = Call;

}).call(this);
