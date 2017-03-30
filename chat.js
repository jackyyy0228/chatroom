var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var groupChat = [];
var privateChat = [];
var users = [];

var i18n = require("i18n");
i18n.configure({
    locales: ['ch', 'en', 'jp', 'fr'],
    directory: __dirname + '/locales'
});
i18n.setLocale('ch');

var express = require('express');
var path = require('path');
app.use(express.static(__dirname, 'public'));

app.get('/', function(req, res) {
    res.sendfile('chat.html');
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

function checkUserOnline(username) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].name === username) {
            if (users[i].online === true) {
                return 'online';
            } else {
                return 'offline';
            }
        }
    }
    return 'non';
}

function getUser(username) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].name === username) {
            return users[i];
        }
    }
    return false;
}

function emitBroadcast(msg) {
    var data = {
        name: '',
        rcv: '',
        msg: msg,
        broadcast: true
    };
    io.emit('group chat message', data);
    groupChat.push(data);
}

io.on('connection', function(socket) {
    var user = {
        name: '',
        online: false
    };

    console.log("total users: " + users.length);

    for (var i = 0; i < groupChat.length; i++) {
        socket.emit('group chat message', groupChat[i])
    }

    for (var i = 0; i < privateChat.length; i++) {
        socket.emit('private chat message', privateChat[i])
    }

    socket.on('add user', function(username) {
        if (checkUserOnline(username) === 'online') {
            console.log(username + ' has been used.');
            socket.emit('type name again');
        } else if (checkUserOnline(username) === 'offline') {
            console.log(username + ' is reconneted.');
            emitBroadcast(username + '上線囉！');
            user = getUser(username);
            user.online = true;

            // add user button at left
            for (var i = 0; i < users.length; i++) {
                socket.emit('show private user', users[i]);
            }
            io.emit('a user reconnect',user.name);

        } else {
            console.log('new user : ' + username + ' has logged.');
            emitBroadcast('歡迎新成員 : ' + username);
            user.name = username;
            user.online = true;
            users.push(user);
            // add user button at left to everybody
            io.emit('show private user', user);

            // add user button at left
            for (var i = 0; i < users.length; i++) {
                socket.emit('show private user', users[i]);
            }

        }
    });
    socket.on('group chat message', function(msg) {
        console.log('Group chat : ' + user.name + ' ' + msg);
        var data = {
            name: user.name,
            rcv: '',
            msg: msg,
            broadcast: false
        };
        groupChat.push(data);
        io.emit('group chat message', data);
    });

    socket.on('private chat message', function(rcv, msg) {
        console.log(user.name + ' to ' + rcv + ' : ' + msg);
        var data = {
            name: user.name, //name is sender
            rcv: rcv,
            msg: msg,
            broadcast: false
        };
        privateChat.push(data);
        io.emit('private chat message', data);
    });

    socket.on('disconnect', function() {
        console.log(user.name + 'is disconnected.');
        emitBroadcast(user.name + '已離開');
        user.online = false;
        io.emit('a user disconnect',user.name);
    });
});
